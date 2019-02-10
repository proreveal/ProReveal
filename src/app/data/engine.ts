import * as util from '../util';
import { Dataset } from './dataset';
import { Query, AggregateQuery } from './query';
import { Queue } from './queue';
import { Scheduler, QueryOrderScheduler } from './scheduler';
import { timer } from 'rxjs';
import { Schema } from './schema';
import { Job } from './job';

export enum Priority {
    Highest,
    Lowest
}

export class Engine {
    rows: any[];
    dataset: Dataset;
    schema: Schema;
    ongoingQueries: Query[] = [];
    completedQueries: Query[] = [];
    scheduler: Scheduler = new QueryOrderScheduler(this.ongoingQueries);
    queue: Queue = new Queue(this.scheduler);
    queryDone: (query: Query) => void;
    runningJob: Job;

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
    }

    remove(query: Query) {
        util.aremove(this.ongoingQueries, query);
        util.aremove(this.completedQueries, query);

        this.queue.remove(query);
    }

    run(simulatedDelay = 2500) {
        if (this.queue.empty()) return;

        const job = this.queue.pop();
        this.runningJob = job;
        job.query.recentProgress.ongoingBlocks = 1;

        let latency = timer(simulatedDelay);
        latency.subscribe(() => {
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
        })
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

    reschedule(scheduler: Scheduler) {
        this.queue.scheduler = scheduler;
        this.queue.reschedule();
    }

    get runningQuery() {
        if(this.runningJob) return this.runningJob.query;
        if(this.queue.jobs.length > 0) return this.queue.jobs[0].query;
        return null;
    }
}
