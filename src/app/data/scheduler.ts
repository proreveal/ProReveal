import { Query, QueryState } from './query';
import { Job } from './job';
import { isUndefined } from 'util';

export abstract class Scheduler {
    name: string;

    abstract schedule(jobs: Job[]): Job[];
}

export class FIFOScheduler extends Scheduler {
    name = 'FIFOScheduler';

    schedule(jobs: Job[]): Job[] {
        jobs.sort((a, b) => {
            if (a.id < b.id) return -1;
            else if (a.id > b.id) return 1;

            if (a.index < b.index) return -1;
            else if (a.index > b.index) return 1;

            return 0;
        });

        return jobs;
    }
}

export class RoundRobinScheduler extends Scheduler {
    name = 'roundrobin';

    constructor(public queries: Query[]) {
        super();
    }

    schedule(jobs: Job[]) {
        const order = {};
        let minIndex = {};

        this.queries.forEach((q, i) => {
            order[q.id] = i;
        });

        jobs.forEach(job => {
            const qid = job.query.id;
            if(isUndefined(minIndex[qid])) minIndex[qid] = job.index;
            if(minIndex[qid] > job.index) minIndex[qid] = job.index;
        });

        const comparator = (a: Job, b: Job) => {
            if(a.query.state === QueryState.Paused) return 1;
            if(b.query.state === QueryState.Paused) return -1;

            const aindex = a.index - minIndex[a.query.id];
            const bindex = b.index - minIndex[b.query.id];

            if (aindex < bindex) return -1;
            else if (aindex > bindex) return 1;

            if(order[a.query.id] < order[b.query.id]) return -1;
            else if(order[a.query.id] > order[b.query.id]) return 1;

            return 0;
        };

        jobs.sort(comparator);

        return jobs;
    }
}

export class QueryOrderScheduler extends Scheduler {
    name = 'queryorder';

    constructor(public queries: Query[]) {
        super();
    }

    schedule(jobs: Job[]) {
        const order = {};
        this.queries.forEach((q, i) => {
            order[q.id] = i;
        });

        jobs.sort((a, b) => {
            if(a.query.state === QueryState.Paused) return 1;
            if(b.query.state === QueryState.Paused) return -1;

            if(order[a.query.id] !== order[b.query.id]) {
                return order[a.query.id] - order[b.query.id];
            }

            return a.index - b.index;
        });

        return jobs;
    }
}
