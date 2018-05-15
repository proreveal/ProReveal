import * as util from '../util';
import { Dataset, FieldTrait, VlType } from '../dataset';
import { assert, assertIn } from './assert';
import {
    AggregateType, AccumulatorTrait, AccumulatedResponseDictionary,
    PartialResponse
} from './accumulator';
import { Query } from './query';

export class ApproxInterval95 {
    constructor(public value: number, public low95: number, public high95: number) {
    }
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

    run(query: Query) {

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
