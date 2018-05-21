import { AggregateQuery, Query } from './query';
import { FieldValue, FieldValueList, FieldTrait } from './field';
import { PartialValue, PartialResponse, AccumulatorTrait } from './accumulator';
import { Dataset } from './dataset';
import { GroupBy } from './groupby';

export abstract class Job {
    static Id = 1;
    id: number;

    constructor(public query:Query, public index:number = 0) {
        this.id = Job.Id++;
    }

    abstract run(): PartialResponse[];
    abstract name(): string;
}

export class AggregateJob extends Job {
    constructor(
        public accumulator: AccumulatorTrait,
        public target: FieldTrait,
        public dataset: Dataset,
        public groupBy: GroupBy,
        public query: Query,
        public index: number,
        public sample: number[]) {
        super(query, index);
    }

    run() {
        let dataset = this.dataset;
        let groupBy = this.groupBy;
        let target = this.target;
        let accumulator = this.accumulator;
        let result: { [key: string]: PartialResponse } = {};

        this.sample.forEach(i => {
            let row = dataset.rows[i];

            let fieldGroupedValueList = groupBy.group(row);
            let hash = fieldGroupedValueList.hash;

            if (!result[hash])
                result[hash] = {
                    fieldGroupedValueList: fieldGroupedValueList,
                    partialValue: accumulator.initPartialValue
                };

            result[hash].partialValue =
                accumulator.reduce(result[hash].partialValue,
                    (this.target ? this.target.group(row[target.name]) : null));
        })

        return Object.values(result);
    }

    name() {
        return "aggregate job";
    }
}

