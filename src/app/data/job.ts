import { Query } from './query';
import { FieldTrait } from './field';
import { AccumulatorTrait } from './accum';
import { Dataset } from './dataset';
import { GroupBy } from './groupby';
import { PartialKeyValue } from './keyvalue';
import * as d3 from 'd3';
import { Predicate, AndPredicate } from './predicate';

export abstract class Job {
    static Id = 1;
    id: number;

    constructor(public query: Query, public index: number = 0) {
        this.id = Job.Id++;
    }

    abstract run(): any;
    abstract name(): string;
}


export class SelectJob extends Job {
    constructor(
        public dataset: Dataset,
        public where: AndPredicate,
        public query: Query
    ) {
        super(query, 0);
    }

    run(): void {
    }

    name() {
        return 'SelectJob';
    }
}

export class AggregateJob extends Job {
    constructor(
        public accumulator: AccumulatorTrait,
        public target: FieldTrait,
        public dataset: Dataset,
        public groupBy: GroupBy,
        public where: Predicate,
        public query: Query,
        public index: number,
        public sample: number[]) {
        super(query, index);
    }

    run(): PartialKeyValue[] {
        let result: { [key: string]: PartialKeyValue } = {};

        this.sample.forEach(i => {
            let row = this.dataset.rows[i];

            if (!this.where.test(row)) return;

            let fieldGroupedValueList = this.groupBy.group(row);
            let hash = fieldGroupedValueList.hash;

            if (!result[hash])
                result[hash] = {
                    key: fieldGroupedValueList,
                    value: this.accumulator.initPartialValue
                };

            result[hash].value =
                this.accumulator.reduce(result[hash].value,
                    (this.target ? row[this.target.name] : 0));
        })

        return d3.values(result);
    }

    name() {
        return 'AggregateJob';
    }
}

