import * as util from '../util';
import { Dataset, Row } from '../data/dataset';
import { Query, AggregateQuery, SelectQuery } from '../data/query';
import { Scheduler, QueryOrderScheduler } from '../data/scheduler';
import { Schema } from '../data/schema';
import { Predicate } from '../data/predicate';
import { Priority } from './priority';
import * as io from 'socket.io-client';
import { RemoteSampler } from '../data/sampler';


export class SparkEngine {
    rows: Row[];
    dataset: Dataset;
    schema: Schema;
    queries: Query[] = []; // all queries (order is meaningless)
    ongoingQueries: Query[] = [];
    completedQueries: Query[] = [];
    scheduler: Scheduler = new QueryOrderScheduler(this.ongoingQueries);
    queryDone: (query: Query) => void;
    selectQueryDone: (query: SelectQuery) => void;
    runningQuery: Query;
    isRunning = true;
    autoRun = false;
    activeTId: number;
    ws: SocketIOClient.Socket;
    info: any;

    constructor(url: string) {
        let ws = io(url, { transports: ['websocket'] })

        this.ws = ws;

        ws.on('welcome', (serverInfo) => {
            this.info = serverInfo;
        })

        ws.on('disconnect', (reason) => {
            console.log(reason)
            this.info = null;
        })

        ws.on('RES/query', (data:any) => {
            const clientQueryId = data.clientQueryId;
            const queryId = data.queryId;

            this.queries.filter(q => q.id === clientQueryId)
                .forEach(q => q.id = queryId);

            console.log(`Upgraded the old id ${clientQueryId} to ${queryId}`);
        });

        ws.on('result', (data: any) => {
            // TODO check query exists
            // TODO check socket id

            const query_json = data.query;
            const job_json = data.job;
            const result = data.result;

            console.log('Result arrived', result)

            const query = this.ongoingQueries.find(q => q.id === query_json.id) as AggregateQuery;
            if(!query) return; // query removed

            let partialKeyValues = query.convertToPartialKeyValues(result);
            query.accumulate(partialKeyValues, job_json.numRows);
            query.sync();

            this.queryDone(query);
        })

        ws.on('STATUS/job/start', (data:any) => {
            const id = data.id;
            const clientId = data.clientId;

            this.runningQuery = this.queries.find(q => q.id == id || q.id == clientId);
        })

        ws.on('STATUS/job/end', (data:any) => {
            const id = data.id;
            const clientId = data.clientId;

            if(this.runningQuery && (this.runningQuery.id == id || this.runningQuery.id == clientId))
                this.runningQuery = null;
        })
    }

    load(): Promise<[Dataset, Schema]> {
        if (this.dataset && this.schema) {
            return Promise.resolve([this.dataset, this.schema] as [Dataset, Schema]);
        }

        let ws = this.ws;

        return new Promise((resolve) => {
            ws.emit('REQ/schema');
            ws.on('RES/schema', (data: any) => {
                const schema = data.schema;
                const numRows = data.numRows;
                const numBatches = data.numBatches;

                this.schema = new Schema(schema);
                this.dataset = new Dataset(data.name, this.schema, [], new RemoteSampler(numRows, numBatches));

                console.log('Got schema', schema);

                resolve([this.dataset, this.schema]);
            });
        });
    }

    run() { }
    runOne() { }

    emit(event: string) {
        this.ws.emit(event);
    }

    request(query: Query, priority: Priority = Priority.Highest) {
        if (priority === Priority.Highest) {
            this.ongoingQueries.unshift(query);
        }
        else if (priority === Priority.Lowest) {
            this.ongoingQueries.push(query);
        }

        this.queries.push(query);

        this.ws.emit('REQ/query', {query: query.toJSON(), queue: this.queueToJSON()})
    }

    pauseQuery(query: Query) {
        query.pause();
        this.ws.emit('REQ/query/pause', {query: query.toJSON(), queue: this.queueToJSON()})
    }

    resumeQuery(query: Query) {
        query.resume();
        this.ws.emit('REQ/query/resume', {query: query.toJSON(), queue: this.queueToJSON()})
    }

    remove(query: Query) {
        util.aremove(this.ongoingQueries, query);
        util.aremove(this.completedQueries, query);

        this.ws.emit('REQ/query/delete', query.toJSON());
    }

    reorderOngoingQueries(queries: Query[]) {
        let order = {};
        queries.forEach((q, i) => order[q.id] = i + 1);
        let n = this.ongoingQueries.length;
        this.ongoingQueries.sort((a, b) => {
            return (order[a.id] || n) - (order[b.id] || n);
        });

        this.ws.emit('REQ/queue/reschedule', this.queueToJSON())
    }

    reschedule(scheduler?: Scheduler) {
        if(scheduler) this.scheduler = scheduler;

        this.ws.emit('REQ/queue/reschedule', this.queueToJSON())
    }

    select(where: Predicate): void {
        let query = new SelectQuery(this.dataset, where);
        this.ws.emit('REQ/query', {query: query.toJSON(), queue: this.queueToJSON()})
    }

    queueToJSON() {
        return {
            mode: this.scheduler.name,
            queries: this.ongoingQueries.map(q => q.toJSON())
        }
    }
}