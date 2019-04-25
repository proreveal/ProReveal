import * as util from '../util';
import { Dataset, Row } from '../data/dataset';
import { Query, AggregateQuery, Frequency1DQuery } from '../data/query';
import { Queue } from '../data/queue';
import { Scheduler, QueryOrderScheduler } from '../data/scheduler';
import { timer, Subscription } from 'rxjs';
import { Schema } from '../data/schema';
import { Job, AggregateJob } from '../data/job';
import { AndPredicate } from '../data/predicate';
import { ExpConstants } from '../exp-constants';
import { Priority } from './priority';
import * as io from 'socket.io-client';
import { PartialKeyValue } from '../data/keyvalue';
import { FieldGroupedValueList } from '../data/field-grouped-value-list';
import { FieldGroupedValue } from '../data/field-grouped-value';
import { PartialValue } from '../data/accum';
import { RemoteSampler } from '../data/sampler';

let TId = 0;

export class SparkEngine {
    rows: Row[];
    dataset: Dataset;
    schema: Schema;
    ongoingQueries: Query[] = [];
    completedQueries: Query[] = [];
    scheduler: Scheduler = new QueryOrderScheduler(this.ongoingQueries);
    queue: Queue = new Queue(this.scheduler);
    queryDone: (query: Query) => void;
    runningJob: Job;
    isRunning = true;
    autoRun = false;
    activeTId: number;
    ws: SocketIOClient.Socket;

    constructor(private url: string) {
        let ws = io(url, { transports: ['websocket'] })

        this.ws = ws;

        ws.on('welcome', (welcome: string) => {
            console.log(`Connected to a Spark Engine (${this.url}): ${welcome}`);
        })

        ws.on('RES/query', (data:any) => {
            const clientQueryId = data.clientQueryId;
            const queryId = data.queryId;

            this.ongoingQueries.filter(q => q.id === clientQueryId)
                .forEach(q => q.id = queryId);

            console.log(`Upgraded the old id ${clientQueryId} to ${queryId}`);
        });

        ws.on('result', (data: any) => {
            // TODO check query exists
            // TODO check socket id

            const query_json = data.query;
            const job_json = data.job;
            const result = data.result;

            const query = this.ongoingQueries.find(q => q.id === query_json.id) as Frequency1DQuery;
            if(!query) return; // query removed

            let partialKeyValues = result.map((kv: [string, number]) => {
                let [key, value] = kv;
                let field = query.grouping;
                let fgvl = new FieldGroupedValueList([
                    new FieldGroupedValue(field, field.group(key))
                ]);
                let partialValue = new PartialValue(0, 0, value, 0, 0, 0);

                return {
                    key: fgvl,
                    value: partialValue
                } as PartialKeyValue
            });

            query.accumulate(partialKeyValues, job_json.numRows);
            query.sync();
        })

    }

    load(): Promise<[Dataset, Schema]> {
        if (this.dataset && this.schema) {
            return Promise.resolve([this.dataset, this.schema] as [Dataset, Schema]);
        }

        let ws = this.ws;

        return new Promise((resolve, reject) => {
            ws.emit('REQ/schema');
            ws.on('RES/schema', (data: any) => {
                const schema = data.schema;
                const numRows = data.numRows;
                const numBatches = data.numBatches;

                this.schema = new Schema(schema);
                this.dataset = new Dataset(this.schema, [], new RemoteSampler(numRows, numBatches));

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

        this.ws.emit('REQ/query', query.toJSON(), priority)

        // query.jobs().forEach(job => this.queue.append(job));
        // this.queue.reschedule();
    }

    pauseQuery(query: Query) {
        query.pause();
        this.ws.emit('REQ/query/pause', query.toJSON());
    }

    resumeQuery(query: Query) {
        query.resume();
        this.ws.emit('REQ/query/resume', query.toJSON());
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

        this.queue.reschedule();
    }

    reschedule(scheduler?: Scheduler) { }

    get runningQuery() {
        if(this.runningJob) return this.runningJob.query;
        return this.queue.peep();
    }

    select(where: AndPredicate, indices: number[]): Row[] {
        if(indices) {
            return indices.map(i => this.dataset.rows[i]).filter((row: Row) => {
                return where.test(row);
            })
        }
        return this.dataset.rows.filter((row: Row) => {
            return where.test(row);
        })
    }
}
