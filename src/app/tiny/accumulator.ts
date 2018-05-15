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

        let min = accResult[hash].accumulatedValue.min;

        accResult[hash].accumulatedValue.min = Math.min(min, pre.partialValue.min);
    })
}

export function MaxAccumulator(partialResult: PartialResponse[], accResult: AccumulatedResponseDictionary) {
    partialResult.forEach(pre => {
        const hash = pre.fieldValueList.hash;
        if (!accResult[hash])
            accResult[hash] = {
                fieldValueList: pre.fieldValueList,
                accumulatedValue: new AccumulatedValue()
            };

        let max = accResult[hash].accumulatedValue.max;

        accResult[hash].accumulatedValue.max = Math.max(max, pre.partialValue.max);
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

export function SumAccumulator(partialResult: PartialResponse[], accResult: AccumulatedResponseDictionary) {
    partialResult.forEach(pre => {
        const hash = pre.fieldValueList.hash;
        if (!accResult[hash])
            accResult[hash] = {
                fieldValueList: pre.fieldValueList,
                accumulatedValue: new AccumulatedValue()
            };

        accResult[hash].accumulatedValue.count += pre.partialValue.count;
        accResult[hash].accumulatedValue.sum += pre.partialValue.sum;
    })
}

export function MeanAccumulator(partialResult: PartialResponse[], accResult: AccumulatedResponseDictionary) {
    partialResult.forEach(pre => {
        const hash = pre.fieldValueList.hash;
        if (!accResult[hash])
            accResult[hash] = {
                fieldValueList: pre.fieldValueList,
                accumulatedValue: new AccumulatedValue()
            };

        accResult[hash].accumulatedValue.count += pre.partialValue.count;
        accResult[hash].accumulatedValue.sum += pre.partialValue.sum;
        accResult[hash].accumulatedValue.ssum += pre.partialValue.ssum;
    })
}
