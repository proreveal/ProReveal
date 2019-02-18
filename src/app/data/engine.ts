import * as util from '../util';
import { Dataset, Row } from './dataset';
import { Query, AggregateQuery } from './query';
import { Queue } from './queue';
import { Scheduler, QueryOrderScheduler } from './scheduler';
import { timer, Subscription } from 'rxjs';
import { Schema } from './schema';
import { Job } from './job';
import { AndPredicate } from './predicate';

export enum Priority {
    Highest,
    Lowest
}

export class Engine {
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

    constructor(private url: string, private schemaUrl: string) {

    }

    /**
     * This will take long. For real datasets, use `sampleRows` instead.
     */
    load(): Promise<[Dataset, Schema]> {
        if (this.dataset && this.schema) {
            return Promise.resolve([this.dataset, this.schema] as [Dataset, Schema]);
        }

        return util.get(this.schemaUrl, "json").then(schema => {
            this.schema = new Schema(schema);

            return util.get(this.url, "json").then(rows => {
                this.rows = rows;
                this.dataset = new Dataset(this.schema, this.rows);

                return [this.dataset, this.schema] as [Dataset, Schema];
            });
        })
    }

    request(query: Query, priority: Priority = Priority.Highest) {
        if (priority === Priority.Highest) {
            this.ongoingQueries.unshift(query);
        }
        else if (priority === Priority.Lowest) {
            this.ongoingQueries.push(query);
        }

        query.jobs().forEach(job => this.queue.append(job));
        this.queue.reschedule();

        if(this.isRunning) this.runOne();
    }

    remove(query: Query) {
        util.aremove(this.ongoingQueries, query);
        util.aremove(this.completedQueries, query);

        this.queue.remove(query);
    }


    latencySubs: Subscription;

    run() {
        this.isRunning = true;
        this.runOne();
    }

    pause() {
        this.isRunning = false;
    }

    gaussianRandom(mean: number, sigma: number) {
        let u = Math.random()*0.682;
        return ((u % 1e-8 > 5e-9 ? 1 : -1) * (Math.sqrt(-Math.log(Math.max(1e-9, u)))-0.618))*1.618 * sigma + mean;
    }

    runOne(noDelay = false) {
        if (this.queue.empty()) return;

        const job = this.queue.pop();

        this.runningJob = job;
        job.query.recentProgress.ongoingBlocks = 1;

        let body = () => {
            this.runningJob = null;

            const partialKeyValues = job.run();
            job.query.recentProgress.ongoingBlocks = 0;

            job.query.accumulate(job, partialKeyValues);

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

        if(noDelay) body(); // no casecading
        else {
            let latency = this.gaussianRandom(3000, 1000);
            if(job.index === 0) latency = 300;

            console.log(`running Job(${job.id}, ${job.index}) with latency of ${latency}`);

            let latencyTimer = timer(latency);
            this.latencySubs = latencyTimer.subscribe(() => {
                body();

                if(this.isRunning)
                    this.runOne();
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
        if(this.queue.jobs.length > 0) return this.queue.jobs[0].query;
        return null;
    }

    select(where: AndPredicate): Row[] {
        return this.dataset.rows.filter((row: Row) => {
            return where.test(row);
        })
    }
}
