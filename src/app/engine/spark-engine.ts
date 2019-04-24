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
    isRunning = false;
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
            const query_json = data.query;
            const job_json = data.job;
            const result = data.result;

            const query = this.ongoingQueries.find(q => q.id === query_json.id) as Frequency1DQuery;

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

            query.accumulate({sample: {length: job_json.numRows}} as any, partialKeyValues);
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
                const numBlocks = data.numBlocks;

                this.schema = new Schema(schema);
                this.dataset = new Dataset(this.schema);
                this.dataset.numRows = numRows;

                resolve([this.dataset, this.schema]);
            });
        });
    }

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

        this.ws.emit('REQ/query', (query as Frequency1DQuery).toJSON(), priority)

        query.jobs().forEach(job => this.queue.append(job));
        this.queue.reschedule();
    }

    remove(query: Query) {
        util.aremove(this.ongoingQueries, query);
        util.aremove(this.completedQueries, query);

        this.queue.remove(query);
    }


    latencySubs: Subscription;

    run() {
        this.autoRun = true;
        if(!this.isRunning) this.runOne();
    }

    pause() {
        this.autoRun = false;
    }

    gaussianRandom(mean: number, sigma: number) {
        let u = Math.random()*0.682;
        return ((u % 1e-8 > 5e-9 ? 1 : -1) * (Math.sqrt(-Math.log(Math.max(1e-9, u)))-0.618))*1.618 * sigma + mean;
    }

    runOne(noDelay = false) {
        if (!this.queue.peep()) { this.isRunning = false; return; }

        this.isRunning = true;
        const job = this.queue.pop();

        this.runningJob = job;
        job.query.recentProgress.ongoingBlocks = 1;

        let body = () => {
            this.runningJob = null;

            const partialKeyValues = job.run();
            job.query.recentProgress.ongoingBlocks = 0;

            job.query.accumulate(job, partialKeyValues);
            job.query.processedIndices = job.query.processedIndices.concat((job as AggregateJob).sample);

            if (job.query instanceof AggregateQuery && job.query.updateAutomatically) {
                job.query.sync();
            }

            if (job.query.recentProgress.done()) {
                util.aremove(this.ongoingQueries, job.query);
                this.completedQueries.push(job.query);
            }

            if (this.queryDone)
                this.queryDone(job.query);
        }

        if(noDelay) {
            body(); // no casecading
            if(this.autoRun && this.queue.peep()) {
                this.runOne();
            }
            else {
                this.isRunning = false;
            }
        }
        else {
            let latency = this.gaussianRandom(ExpConstants.latencyMean, ExpConstants.latencyStdev);
            if(job.index === 0) latency = ExpConstants.initialLatency;

            console.log(`running Job(${job.id}, ${job.index}) with latency of ${latency}`);

            let latencyTimer = timer(latency);
            let tid = TId++;
            this.activeTId = tid;
            this.latencySubs = latencyTimer.subscribe(() => {
                if(tid != this.activeTId) return;
                body();

                if(this.autoRun && this.queue.peep()) {
                    this.runOne();
                }
                else {
                    this.isRunning = false;
                }
            });
        }
    }

    empty() {
        return this.queue.empty();
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

    reschedule(scheduler?: Scheduler) {
        if(scheduler) this.queue.scheduler = scheduler;
        this.queue.reschedule();
    }

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
