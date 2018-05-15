import { FieldTrait, VlType } from '../dataset';
import { assert, assertIn } from './assert';
import { AccumulatedResponseDictionary, AccumulatorTrait, PartialResponse } from './accumulator';

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

export interface Query {

}

/**
 * represent an aggregate query such as min(age) by occupation
 */
export class AggregateQuery implements Query {
    result: AccumulatedResponseDictionary = {};
    id:number;
    static QueryId = 1;

    constructor(public target: FieldTrait,
        public accumulator:AccumulatorTrait,
        public groupBy: GroupBy) {

        this.id = AggregateQuery.QueryId++;

        // target should be quantitative
        assert(target.vlType, VlType.Quantitative);

        // groupBy should be nominal, ordinal, or dozens
        // this is checked in the constructor of GroupBy
    }

    accumulate(partialResult: PartialResponse[]) {
        this.accumulator(partialResult, this.result);
    }
}

export class CountQuery implements Query {

}
