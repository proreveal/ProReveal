import * as util from '../util';
import { Dataset } from './dataset';
import { FieldTrait, VlType } from './field';
import { Query, AggregateQuery } from './query';
import { Queue } from './queue';
import { Scheduler, QueryOrderScheduler } from './scheduler';
import { timeout } from 'rxjs/operators';
import { timer } from 'rxjs';

export enum Priority {
    Highest,
    AfterCompletedQueries,
    Lowest
}

export class Engine {
    rows: any[];
    dataset: Dataset;
    ongoingQueries: Query[] = [];
    completedQueries: Query[] = [];
    scheduler: Scheduler = new QueryOrderScheduler(this.ongoingQueries);
    queue: Queue = new Queue(this.scheduler);
    queryDone: () => void;

    constructor(private url: string) {

    }

    /**
     * This will take long. For real datasets, use `sampleRows` instead.
     */
    load(): Promise<Dataset> {
        if (this.dataset) {
            return Promise.resolve(this.dataset);
        }

        return util.get(this.url, "json").then(rows => {
            this.rows = rows;
            this.dataset = new Dataset(this.rows);

            return this.dataset;
        })
    }

    request(query: Query, priority: Priority = Priority.AfterCompletedQueries) {
        if (priority === Priority.AfterCompletedQueries) {
            let lastIndex = 0;
            this.ongoingQueries.forEach((query, i) => {
                if (query.visibleProgress.done()) lastIndex = i + 1;
            })

            this.ongoingQueries.splice(lastIndex, 0, query);
        }
        else if (priority === Priority.Lowest) {
            this.ongoingQueries.push(query);
        }

        query.jobs.forEach(job => this.queue.append(job));
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

        job.query.recentProgress.ongoingBlocks = 1;

        let latency = timer(simulatedDelay);
        latency.subscribe(() => {
            const partialKeyValues = job.run();
            job.query.recentProgress.ongoingBlocks = 0;

            job.query.accumulate(job, partialKeyValues);

            if (job.query instanceof AggregateQuery && job.query.updateAutomatically) {
                job.query.sync();
            }

            if (job.query.recentProgress.done()) {
                this.ongoingQueries.splice(0, 1);
                this.completedQueries.push(job.query);
            }

            if (this.queryDone)
                this.queryDone();
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
}
