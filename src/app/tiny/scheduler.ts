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
        if(this.schedulingAlgorithm === SchedulingAlgorithm.FIFO) {
            jobs.sort((a, b) => {
                if(a.id < b.id) return -1;
                else if(a.id > b.id) return 1;

                if(a.index < b.index) return -1;
                else if(a.index > b.index) return 1;

                return 0;
            })
        }
        else if(this.schedulingAlgorithm === SchedulingAlgorithm.RoundRobin) {
            jobs.sort((a, b) => {
                if(a.index < b.index) return -1;
                else if(a.index > b.index) return 1;

                if(a.id < b.id) return -1;
                else if(a.id > b.id) return 1;

                return 0;
            })
        }
        else if(this.schedulingAlgorithm === SchedulingAlgorithm.CustomOrder) {
            throw "CustomOrder Scheduling is currently not supported!";
        }

        return jobs;
    }
}
