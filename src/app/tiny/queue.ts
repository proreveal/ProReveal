import { Job } from './job';
import { Scheduler } from './scheduler';
import { ServerError } from './exception';

export class Queue {
    private jobs: Job[] = [];

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
        this.scheduler.schedule(this.jobs);
    }
}
