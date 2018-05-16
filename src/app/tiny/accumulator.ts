import { FieldTrait, FieldValueList } from '../dataset';

export enum AggregateType {
    Min,
    Max,
    Sum,
    Count,
    Mean,
    Var
}

/**
 * only a value
 */
export class PartialValue {
    constructor(public sum: number = 0,
        public ssum: number = 0,
        public count: number = 0,
        public min: number = 0,
        public max: number = 0) {
    }
}

/**
 * a single row of response (keys & value)
 */
export interface PartialResponse {
    fieldValueList: FieldValueList;
    partialValue: PartialValue;
}

/**
 * only a value
 */
export class AccumulatedValue {
    constructor(public sum: number = 0,
        public ssum: number = 0,
        public count: number = 0,
        public min: number = 0,
        public max: number = 0) {
    }
}

/**
 * a single row of response (keys & value)
 */
export interface AccumulatedResponse {
    fieldValueList: FieldValueList;
    accumulatedValue: AccumulatedValue;
}

/**
 * a set of rows (hash => (keys & value))
 */
export type AccumulatedResponseDictionary = { [hash: string]: AccumulatedResponse };

export interface AccumulatorTrait {
    readonly initPartialValue:PartialValue;
    readonly initAccumulatedValue:AccumulatedValue;

    reduce(a: PartialValue, b: number): PartialValue;

    accumulate(a: AccumulatedValue, b: PartialValue): AccumulatedValue;
}

export class MinAccumulator implements AccumulatorTrait {
    readonly initPartialValue =
        Object.freeze(new PartialValue(0, 0, 0, Number.MAX_VALUE, 0));

    readonly initAccumulatedValue =
        Object.freeze(new AccumulatedValue(0, 0, 0, Number.MAX_VALUE, 0));


    reduce(a: PartialValue, b: number) {
        return new PartialValue(0, 0, 0, Math.min(a.min, b), 0);
    }

    accumulate(a: AccumulatedValue, b: PartialValue) {
        return new AccumulatedValue(0, 0, 0, Math.min(a.min, b.min), 0);
    }
}

export class MaxAccumulator implements AccumulatorTrait {
    readonly initPartialValue =
        Object.freeze(new PartialValue(0, 0, 0, Number.MIN_VALUE, 0));

    readonly initAccumulatedValue =
        Object.freeze(new AccumulatedValue(0, 0, 0, Number.MIN_VALUE, 0));


    reduce(a: PartialValue, b: number) {
        return new PartialValue(0, 0, 0, Math.max(a.max, b), 0);
    }

    accumulate(a: AccumulatedValue, b: PartialValue) {
        return new AccumulatedValue(0, 0, 0, Math.max(a.max, b.max), 0);
    }
}

export class CountAccumulator implements AccumulatorTrait {
    readonly initPartialValue =
        Object.freeze(new PartialValue(0, 0, 0, 0, 0));

    readonly initAccumulatedValue =
        Object.freeze(new AccumulatedValue(0, 0, 0, 0, 0));


    reduce(a: PartialValue, b: number) {
        return new PartialValue(0, 0, a.count + 1, 0, 0);
    }

    accumulate(a: AccumulatedValue, b: PartialValue) {
        return new AccumulatedValue(0, 0, a.count + b.count, 0, 0);
    }
}

export class SumAccumulator implements AccumulatorTrait {
    readonly initPartialValue =
        Object.freeze(new PartialValue(0, 0, 0, 0, 0));

    readonly initAccumulatedValue =
        Object.freeze(new AccumulatedValue(0, 0, 0, 0, 0));


    reduce(a: PartialValue, b: number) {
        return new PartialValue(a.sum + b, 0, 0, 0, 0);
    }

    accumulate(a: AccumulatedValue, b: PartialValue) {
        return new AccumulatedValue(a.sum + b.sum, 0, 0, 0, 0);
    }
}

export class MeanAccumulator implements AccumulatorTrait {
    readonly initPartialValue =
        Object.freeze(new PartialValue(0, 0, 0, 0, 0));

    readonly initAccumulatedValue =
        Object.freeze(new AccumulatedValue(0, 0, 0, 0, 0));


    reduce(a: PartialValue, b: number) {
        return new PartialValue(a.sum + b, a.ssum + b * b, a.count + 1, 0, 0);
    }

    accumulate(a: AccumulatedValue, b: PartialValue) {
        return new AccumulatedValue(a.sum + b.sum, a.ssum + b.ssum, a.count + b.count, 0, 0);
    }
}
