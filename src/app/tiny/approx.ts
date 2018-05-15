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
    constructor(public value: number = 0,
        public sum: number = 0,
        public ssum: number = 0,
        public count: number = 0) {
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
    constructor(public value: number = 0,
        public sum: number = 0,
        public ssum: number = 0,
        public count: number = 0) {
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

export type AccumulatorTrait =
    (partialResult: PartialResponse[], accResult: AccumulatedResponseDictionary)
        => void;

export function MinAccumulator(partialResult: PartialResponse[], accResult: AccumulatedResponseDictionary) {
    partialResult.forEach(pre => {
        const hash = pre.fieldValueList.hash;
        if (!accResult[hash])
            accResult[hash] = {
                fieldValueList: pre.fieldValueList,
                accumulatedValue: new AccumulatedValue()
            };

        let value = accResult[hash].accumulatedValue.value;

        accResult[hash].accumulatedValue.value = Math.min(value, pre.partialValue.value);
    })
}

export function CountAccumulator(partialResult: PartialResponse[], accResult: AccumulatedResponseDictionary) {
    partialResult.forEach(pre => {
        const hash = pre.fieldValueList.hash;
        if (!accResult[hash])
            accResult[hash] = {
                fieldValueList: pre.fieldValueList,
                accumulatedValue: new AccumulatedValue()
            };

        accResult[hash].accumulatedValue.count += pre.partialValue.count;
    })
}

export class AccumulatedResult { // should be visualized
    result: AccumulatedResponseDictionary = {};

    constructor(public accumulator: AccumulatorTrait) {
    }

    accumulate(partialResult: PartialResponse[]) {
        this.accumulator(partialResult, this.result);
    }
}
