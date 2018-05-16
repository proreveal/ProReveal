import { AggregateQuery, Query } from './query';
import { FieldValue, FieldValueList } from '../dataset';
import { PartialValue, PartialResponse } from './accumulator';

export abstract class Job {
    static Id = 1;

    id: number;

    constructor(public query: Query) {
        this.id = Job.Id++;
    }

    abstract run(): PartialResponse[];
}

export class AggregateJob extends Job {
    constructor(public query: AggregateQuery, public index: number, public sample: number[]) {
        super(query);
    }

    run() {
        let dataset = this.query.dataset;
        let groupBy = this.query.groupBy;
        let target = this.query.target;
        let accumulator = this.query.accumulator;
        let result: { [key: string]: PartialResponse } = {};

        this.sample.forEach(i => {
            let row = dataset.rows[i];

            let fieldValueList = new FieldValueList(groupBy.fields.map(field => {
                return new FieldValue(field, row[field.name]);
            }));

            let hash = fieldValueList.hash;

            if (!result[hash])
                result[hash] = {
                    fieldValueList: fieldValueList,
                    partialValue: accumulator.initPartialValue
                };

            result[hash].partialValue =
                accumulator.reduce(result[hash].partialValue, +row[target.name]);
        })

        return Object.values(result);
    }
}

