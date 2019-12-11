import * as util from '../util';
import { Dataset, Row } from '../data/dataset';
import { Query, AggregateQuery, SelectQuery } from '../data/query';
import { Queue } from '../data/queue';
import { Scheduler, QueryOrderScheduler, RoundRobinScheduler } from '../data/scheduler';
import { timer, Subscription } from 'rxjs';
import { Schema } from '../data/schema';
import { Job, AggregateJob } from '../data/job';
import { AndPredicate, Predicate } from '../data/predicate';
import { ExpConstants } from '../exp-constants';
import { Priority } from './priority';
import { UniformNumBlocksSampler } from '../data/sampler';
import { Safeguard } from '../safeguard/safeguard';

let TId = 0;

export class BrowserEngine {
    rows: Row[];
    dataset: Dataset;
    schema: Schema;
    queries: Query[] = []; // all queries (order is meaningless)
    ongoingQueries: Query[] = [];
    completedQueries: Query[] = [];
    scheduler: Scheduler = new QueryOrderScheduler(this.ongoingQueries);
    queue: Queue = new Queue(this.scheduler);
    jobDone: (query: Query) => void;
    queryCreated: (query: Query) => void;
    selectQueryDone: (where: Predicate, rows: Row[]) => void;
    safeguards: Safeguard[] = [];

    runningJob: Job;
    isRunning = false;
    autoRun = false;
    activeTId: number;
    alternate = false;

    constructor(private url: string, private schemaUrl: string) {

    }

    load(): Promise<[Dataset, Schema]> {
        if (this.dataset && this.schema) {
            return Promise.resolve([this.dataset, this.schema] as [Dataset, Schema]);
        }

        return util.get(this.schemaUrl, 'json').then(schema => {
            this.schema = new Schema(schema);

            return util.get(this.url, 'json').then(rows => {
                this.rows = rows;
                this.dataset = new Dataset(util.getFileName(this.url), this.schema, this.rows, new UniformNumBlocksSampler(
                    this.rows.length,
                    ExpConstants.numBatches
                ));

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
        this.queries.push(query);

        this.queryCreated(query);

        query.jobs().forEach(job => this.queue.append(job));
        this.queue.reschedule();

        if(this.autoRun && !this.isRunning) this.runOne();
    }


    requestSafeguard(sg: Safeguard) {
        this.safeguards.unshift(sg);
        sg.query.safeguards.push(sg);
    }

    remove(query: Query) {
        util.aremove(this.ongoingQueries, query);
        util.aremove(this.completedQueries, query);
        util.aremove(this.queries, query);

        this.queue.remove(query);
    }

    removeSafeguard(sg: Safeguard){
        util.aremove(this.safeguards, sg);
        util.aremove(sg.query.safeguards, sg);
    }

    latencySubs: Subscription;

    run() {
        this.autoRun = true;
        if(!this.isRunning) this.runOne();
    }

    pause() {
        this.autoRun = false;
    }

    pauseQuery(query: Query) {
        query.pause();
        this.reschedule(this.alternate);
    }

    pauseAllQueries() {
        this.ongoingQueries.forEach(query => {
            this.pauseQuery(query);
        });
    }

    resumeQuery(query: Query) {
        query.resume();
        this.reschedule(this.alternate);
    }

    resumeAllQueries() {
        this.ongoingQueries.forEach(query => {
            this.resumeQuery(query);
        });
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

            job.query.accumulate(partialKeyValues, (job as AggregateJob).sample.length);
            job.query.processedIndices = job.query.processedIndices.concat((job as AggregateJob).sample);

            if (job.query instanceof AggregateQuery && job.query.updateAutomatically) {
                job.query.sync();
            }

            if (job.query.recentProgress.done()) {
                util.aremove(this.ongoingQueries, job.query);
                this.completedQueries.push(job.query);
            }

            if (this.jobDone)
                this.jobDone(job.query);
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

    reordered() {
        this.reschedule(this.alternate);
    }

    reschedule(alternate:boolean) {
        let scheduler;

        this.alternate = alternate;

        if (alternate) scheduler = new RoundRobinScheduler(this.ongoingQueries);
        else scheduler = new QueryOrderScheduler(this.ongoingQueries);

        this.queue.scheduler = scheduler;
        this.queue.reschedule();
    }


    get runningQuery() {
        if(this.runningJob) return this.runningJob.query;
        return this.queue.peep();
    }

    select(where: Predicate, indices?: number[]): void {
        let rows: Row[];
        if(indices) {
            rows = indices.map(i => this.dataset.rows[i]).filter((row: Row) => where.test(row));
        }
        else {
            rows = this.dataset.rows.filter((row: Row) => where.test(row));
        }

        this.selectQueryDone(where, rows);
    }
}
