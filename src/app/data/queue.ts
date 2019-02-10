import { Job } from './job';
import { Scheduler } from './scheduler';
import { ServerError } from './exception';
import { Query } from './query';

export class Queue {
    jobs: Job[] = [];

    constructor(public scheduler:Scheduler) {

    }

    append(job:Job) {
        this.jobs.push(job);
    }

    size() {
        return this.jobs.length;
    }

    empty() {
        return this.size() === 0;
    }

    head() {
        if(!this.size())
            throw new ServerError("the queue is empty");

        return this.jobs[0];
    }

    pop() {
        if(!this.size())
            throw new ServerError("the queue is empty");

        return this.jobs.shift();
    }

    reschedule() {
        this.jobs = this.scheduler.schedule(this.jobs);
    }

    remove(query: Query){
        this.jobs = this.jobs.filter(job => job.query !== query)
    }

    get headQuery() {
        if(this.jobs.length > 0) return this.jobs[0].query;
        return null;
    }
}
