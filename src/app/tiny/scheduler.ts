import { Query } from './query';

export enum SchedulingAlgorithm {
    FIFO,
    RoundRobin,
    CustomOrder
}

export class Scheduler {
    schedulingAlgorithm: SchedulingAlgorithm = SchedulingAlgorithm.FIFO;

    constructor() {

    }

}

export class Job {
    static JobId = 1;

    id: number;

    constructor(public query: Query) {
        this.id = Job.JobId++;
    }
}

export class Queue {
    jobs: Job[];

    constructor() {

    }
}
