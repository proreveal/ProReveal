import * as util from '../util';
import { Dataset, FieldTrait, VlType} from '../dataset';
import { assert, assertIn } from './assert';
import { AggregateType } from './approx';


export class ApproxInterval95 {
    constructor(public value: number, public low95: number, public high95: number) {
    }
}

/**
 * Represents a list of categorical columns.
 * The order matters.
 */
export class GroupBy {
    constructor(public fields:FieldTrait[]) {
        fields.forEach(field => assertIn(field.vlType,
            [VlType.Dozen, VlType.Nominal, VlType.Ordinal]
        ));
    }
}

/**
 * represent an aggregate query such as min(age) by occupation
 */
export class AggregateQuery {
    constructor(public target: FieldTrait,
        public aggregateType: AggregateType, public groupBy: GroupBy) {

        // target should be quantitative
        assert(target.vlType, VlType.Quantitative);

        // groupBy should be nominal, ordinal, or dozens
        // this is checked in the constructor of GroupBy
    }
}

export class Scheduler {

}

export class Job {

}

export class Queue {

}


export class TinyServer {
    rows: any[];
    dataset: Dataset;

    constructor(private uri: string) {

    }

    /**
     * This will take long. For real datasets, use `sampleRows` instead.
     */
    load(): Promise<Dataset> {
        if (this.dataset) {
            return Promise.resolve(this.dataset);
        }

        return util.get(this.uri, "json").then(rows => {
            this.rows = rows;
            this.dataset = new Dataset(this.rows);

            return this.dataset;
        })
    }

    run(query: AggregateQuery) {

    }

    sampleRows() {
        // return this.http
        //     .get('./assets/movies.json')
        //     .pipe(
        //         map(res => {
        //             return res.filter(() => Math.random() < 0.1);
        //         })
        //     )
    }
}
