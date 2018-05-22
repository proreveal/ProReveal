import { FieldTrait, FieldValueList, FieldGroupedValueList } from './field';
import { isNull } from 'util';

/**
 * only a value
 */
export class PartialValue {
    constructor(public sum: number,
        public ssum: number,
        public count: number,
        public min: number,
        public max: number,
        public nullCount: number) {
    }
}

/**
 * a single row of response (keys & value)
 */
export interface PartialResponse {
    fieldGroupedValueList: FieldGroupedValueList;
    partialValue: PartialValue;
}

/**
 * only a value
 */
export class AccumulatedValue {
    constructor(public sum: number,
        public ssum: number,
        public count: number,
        public min: number,
        public max: number,
        public nullCount: number) {
    }
}

/**
 * a single row of response (keys & value)
 */
export interface AccumulatedResponse {
    fieldGroupedValueList: FieldGroupedValueList;
    accumulatedValue: AccumulatedValue;
}

/**
 * a set of rows (hash => (keys & value))
 */
export type AccumulatedResponseDictionary = { [hash: string]: AccumulatedResponse };

export interface AccumulatorTrait {
    readonly initPartialValue: PartialValue;
    readonly initAccumulatedValue: AccumulatedValue;
    readonly name: string;

    reduce(a: PartialValue, b: number | null): PartialValue;
    accumulate(a: AccumulatedValue, b: PartialValue): AccumulatedValue;
    desc(res: AccumulatedValue): string;
}

export class MinAccumulator implements AccumulatorTrait {
    readonly initPartialValue =
        Object.freeze(new PartialValue(0, 0, 0, Number.MAX_VALUE, 0, 0));

    readonly initAccumulatedValue =
        Object.freeze(new AccumulatedValue(0, 0, 0, Number.MAX_VALUE, 0, 0));

    readonly name = "min";

    reduce(a: PartialValue, b: number | null) {
        if (isNull(b)) return new PartialValue(0, 0, a.count + 1, a.min, 0, a.nullCount + 1);
        return new PartialValue(0, 0, a.count + 1, Math.min(a.min, b), 0, a.nullCount);
    }

    accumulate(a: AccumulatedValue, b: PartialValue) {
        return new AccumulatedValue(0, 0, a.count + b.count, Math.min(a.min, b.min), 0, a.nullCount + b.nullCount);
    }

    desc(res: AccumulatedValue) {
        return `${res.min} (count=${res.count}, nullCount=${res.nullCount})`;
    }
}

export class MaxAccumulator implements AccumulatorTrait {
    readonly initPartialValue =
        Object.freeze(new PartialValue(0, 0, 0, -Number.MAX_VALUE, 0, 0));

    readonly initAccumulatedValue =
        Object.freeze(new AccumulatedValue(0, 0, 0, -Number.MAX_VALUE, 0, 0));

    readonly name = "max";

    reduce(a: PartialValue, b: number | null) {
        if (isNull(b)) return new PartialValue(0, 0, a.count + 1, a.max, 0, a.nullCount + 1);
        return new PartialValue(0, 0, a.count + 1, Math.max(a.max, b), 0, a.nullCount);
    }

    accumulate(a: AccumulatedValue, b: PartialValue) {
        return new AccumulatedValue(0, 0, a.count + b.count, Math.max(a.max, b.max), 0, a.nullCount + b.nullCount);
    }

    desc(res: AccumulatedValue) {
        return `${res.max} (count=${res.count}, nullCount=${res.nullCount})`;
    }
}

export class CountAccumulator implements AccumulatorTrait {
    readonly initPartialValue =
        Object.freeze(new PartialValue(0, 0, 0, 0, 0, 0));

    readonly initAccumulatedValue =
        Object.freeze(new AccumulatedValue(0, 0, 0, 0, 0, 0));

    readonly name = "count";

    reduce(a: PartialValue, b: number | null) {
        if (isNull(b)) return new PartialValue(0, 0, a.count + 1, 0, 0, a.nullCount + 1);
        return new PartialValue(0, 0, a.count + 1, 0, 0, a.nullCount);
    }

    accumulate(a: AccumulatedValue, b: PartialValue) {
        return new AccumulatedValue(0, 0, a.count + b.count, 0, 0, a.nullCount + b.nullCount);
    }

    desc(res: AccumulatedValue) {
        return `${res.count} (count=${res.count}, nullCount=${res.nullCount})`;
    }
}

export class SumAccumulator implements AccumulatorTrait {
    readonly initPartialValue =
        Object.freeze(new PartialValue(0, 0, 0, 0, 0, 0));

    readonly initAccumulatedValue =
        Object.freeze(new AccumulatedValue(0, 0, 0, 0, 0, 0));

    readonly name = "sum";

    reduce(a: PartialValue, b: number | null) {
        if (isNull(b)) return new PartialValue(a.sum, 0, a.count + 1, 0, 0, a.nullCount + 1);
        return new PartialValue(a.sum + b, 0, a.count + 1, 0, 0, a.nullCount);
    }

    accumulate(a: AccumulatedValue, b: PartialValue) {
        return new AccumulatedValue(a.sum + b.sum, 0, a.count + b.count, 0, 0, a.nullCount + b.nullCount);
    }

    desc(res: AccumulatedValue) {
        return `${res.sum} (count=${res.count}, nullCount=${res.nullCount})`;
    }
}

export class MeanAccumulator implements AccumulatorTrait {
    readonly initPartialValue =
        Object.freeze(new PartialValue(0, 0, 0, 0, 0, 0));

    readonly initAccumulatedValue =
        Object.freeze(new AccumulatedValue(0, 0, 0, 0, 0, 0));

    readonly name = "mean";

    reduce(a: PartialValue, b: number | null) {
        if (isNull(b)) return new PartialValue(a.sum, a.ssum, a.count + 1, 0, 0, a.nullCount + 1);
        return new PartialValue(a.sum + b, a.ssum + b * b, a.count + 1, 0, 0, a.nullCount);
    }

    accumulate(a: AccumulatedValue, b: PartialValue) {
        return new AccumulatedValue(a.sum + b.sum, a.ssum + b.ssum, a.count + b.count, 0, 0, a.nullCount + b.nullCount);
    }

    desc(res: AccumulatedValue) {
        return `${res.sum / res.count} (count=${res.count}, nullCount=${res.nullCount})`;
    }
}
