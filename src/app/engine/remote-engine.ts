import * as util from '../util';
import { Dataset, Row } from '../data/dataset';
import { Query, AggregateQuery, SelectQuery } from '../data/query';
import { Schema } from '../data/schema';
import { Predicate } from '../data/predicate';
import * as io from 'socket.io-client';
import { RemoteSampler } from '../data/sampler';
import { Safeguard, DistributiveSafeguard } from '../safeguard/safeguard';
import { SocketService } from '../services/socket.service';


export class RemoteEngine {
    rows: Row[];
    dataset: Dataset;
    schema: Schema;

    queries: Query[] = []; // all queries (order is meaningless)
    ongoingQueries: Query[] = []; // ongoing queries (highest -> lowest)
    completedQueries: Query[] = []; // complete queries (most recent -> oldest)
    jobDone: (query: Query) => void;
    queryCreated: (query: Query) => void;
    selectQueryDone: (query: SelectQuery) => void;
    runningQuery: Query;
    isRunning = true;
    autoRun = false;
    activeTId: number;
    alternate = false;
    safeguards: Safeguard[] = [];

    constructor(private socket: SocketService) {
        socket.ws.on('RES/query', (data:any) => {

            const querySpec = data.query;
            const query = Query.fromJSON(querySpec, this.dataset);

            console.log('new query created from the server', data, query)

            this.queries.push(query);
            this.ongoingQueries.push(query);
            this.ongoingQueries.sort((a, b) => a.order - b.order);

            this.queryCreated(query);
        });

        socket.ws.on('RES/safeguard', (data:any) => {
            console.log('new safeguard created from the server', data);

            const sgSpec = data.safeguard;
            const query = this.queries.find(q => q.id === sgSpec.queryId) as AggregateQuery;

            if(!query) return;

            const sg = Safeguard.fromJSON(sgSpec, this.dataset, query);

            this.safeguards.unshift(sg);
        });

        socket.ws.on('result', (data: any) => {
            console.log('Result arrived', data)

            const query = this.ongoingQueries.find(q => q.id === data.query.id) as AggregateQuery;
            if(!query) return; // query removed

            query.lastUpdated = data.query.lastUpdated;
            query.recentProgress.processedRows = data.query.numProcessedRows;
            query.recentProgress.processedBlocks = data.query.numProcessedBlocks;

            let aggregateKeyValues = query.convertToAggregateKeyValues(data.query.result);
            query.recentResult = {};
            aggregateKeyValues.forEach(kv => {
                query.recentResult[kv.key.hash] = kv;
            });

            if(query.updateAutomatically) query.sync();

            this.safeguards.forEach(sg => {
                if (sg.lastUpdated < sg.query.lastUpdated) {
                    sg.lastUpdated = sg.query.lastUpdated;
                    sg.lastUpdatedAt = new Date(sg.query.lastUpdated);
                }

                if (sg instanceof DistributiveSafeguard && sg.query === query) {
                    sg.updateConstant();
                }
            })

            this.jobDone(query);
        })

        socket.ws.on('STATUS/job/start', (data:any) => {
            const id = data.id;
            const query = this.queries.find(q => q.id == id);
            console.log('job start',  data)

            this.runningQuery = query;
            query.recentProgress.ongoingBlocks = data.numOngoingBlocks;
            query.recentProgress.ongoingRows = data.numOngoingRows;
        })

        socket.ws.on('STATUS/job/end', (data:any) => {
            const id = data.id;
            const clientId = data.clientId;

            if(this.runningQuery && (this.runningQuery.id == id || this.runningQuery.id == clientId))
            {
                this.runningQuery.recentProgress.ongoingBlocks = 0;
                this.runningQuery.recentProgress.ongoingRows = 0;
                this.runningQuery = null;
            }
        })

        socket.ws.on('STATUS/queries', (data:any) => {
            /*
            data: {qid: {order: 1, state: running}}
            */
            console.log('new query states', data);

            this.queries = this.queries.filter(q => data[q.id]);

            this.queries.forEach(q => {
                q.state = data[q.id].state;
                q.order = data[q.id].order;
            });

            this.ongoingQueries = this.queries.filter(q => !q.done());
            this.completedQueries = this.queries.filter(q => q.done());

            this.ongoingQueries.sort((a, b) => a.order - b.order);
            this.completedQueries.sort((a, b) => a.order - b.order);
        });

        socket.ws.on('STATUS/safeguards', (data:any) => {
            /*
            data: [sg1_json, sg2_json, ... ]
            */
            console.log('new safeguard states', data);

            this.safeguards = this.safeguards.filter(sg => data[sg.id]);
        })
    }

    connect(): Promise<void> {
        let ws = this.socket.ws;

        return new Promise((resolve) => {
            if(ws.connected) resolve();
            ws.on('connect', () => {
                resolve();
            });
        })
    }

    restore(code: string): Promise<[Dataset, Schema]> {
        let ws = this.socket.ws;

        return new Promise((resolve) => {
            ws.on('RES/restore', (data: any) => {
                console.log('Restored the session!!', data);

                const schema = data.metadata.schema;
                const numRows = data.metadata.numRows;
                const numBatches = data.metadata.numBatches;

                this.schema = new Schema(schema);
                this.dataset = new Dataset(data.metadata.name, this.schema, [],
                    new RemoteSampler(numRows, numBatches));

                this.alternate = data.session.alternate;

                console.log('Got schema', schema);

                // restore queries

                data.session.queries.forEach((querySpec: any) => {
                    const query = Query.fromJSON(querySpec, this.dataset);

                    this.queries.push(query);

                    if(query.done())
                        this.completedQueries.push(query);
                    else
                        this.ongoingQueries.push(query);
                })

                this.ongoingQueries.sort((a, b) => a.order - b.order);
                this.completedQueries.sort((a, b) => a.order - b.order);

                // restore safeguards

                data.session.safeguards.forEach((sgSpec:any) => {
                    const query = this.queries.find(q => q.id === sgSpec.queryId) as AggregateQuery;

                    if(!query) return;

                    const sg = Safeguard.fromJSON(sgSpec, this.dataset, query);
                    console.log(query.visibleData);

                    this.safeguards.push(sg);
                })

                resolve([this.dataset, this.schema]);
            })
            .emit('REQ/restore', {code: code});
            console.log('Restore emitted');

        });
    }

    run() { }
    runOne() { }

    emit(event: string) {
        this.socket.ws.emit(event);
    }

    request(query: Query) {
        this.socket.ws.emit('REQ/query', {query: query.toJSON()});
    }

    requestSafeguard(sg: Safeguard) {
        this.socket.ws.emit('REQ/safeguard', {safeguard: sg.toJSON()});
    }

    pauseQuery(query: Query) {
        query.pause();
        this.socket.ws.emit('REQ/query/pause', {query: query.toJSON()})
    }

    pauseAllQueries() {
        this.ongoingQueries.forEach(query => {
            this.pauseQuery(query);
        });
    }

    resumeQuery(query: Query) {
        query.resume();
        this.socket.ws.emit('REQ/query/resume', {query: query.toJSON()})
    }

    resumeAllQueries() {
        this.ongoingQueries.forEach(query => {
            this.resumeQuery(query);
        });
    }

    remove(query: Query) {
        util.aremove(this.ongoingQueries, query);
        util.aremove(this.completedQueries, query);

        this.socket.ws.emit('REQ/query/remove', query.toJSON());
    }

    removeSafeguard(sg: Safeguard){
        this.socket.ws.emit('REQ/safeguard/remove', {safeguard: sg.toJSON()});
    }

    reordered() {
        let order:{[key: string]: number} = {};
        let i = 0
        this.completedQueries.forEach(q => {
            order[q.id] = i++;
        })
        this.ongoingQueries.forEach(q => {
            order[q.id] = i++;
        })

        this.socket.ws.emit('REQ/query/reorder', {order: order});
    }

    reschedule(alternate:boolean) {
        this.alternate = alternate;

        this.socket.ws.emit('REQ/queue/reschedule', {
            alternate: this.alternate
        });
    }

    select(where: Predicate): void {
        let query = new SelectQuery(this.dataset, where);
        this.socket.ws.emit('REQ/query', {query: query.toJSON()})
    }
}
