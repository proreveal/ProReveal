import { Query } from './query';
import { Job } from './job';

export enum SchedulingAlgorithm {
    FIFO = "FIFO",
    RoundRobin = "RoundRobin",
    CustomOrder = "CustomOrder"
}

export class Scheduler {
    constructor(public schedulingAlgorithm:SchedulingAlgorithm = SchedulingAlgorithm.FIFO) {

    }

    schedule(jobs:Job[]) {

    }
}
