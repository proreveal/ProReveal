import { FieldTrait, FieldValueList, FieldGroupedValueList } from './field';
import { isNull } from 'util';
import { ApproximatedInterval } from './approx';



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
    readonly alwaysNonNegative: boolean;
    readonly requireTargetField: boolean;

    reduce(a: PartialValue, b: number | null): PartialValue;
    accumulate(a: AccumulatedValue, b: PartialValue): AccumulatedValue;
    desc(value: AccumulatedValue): string;
    /**
     * processed: percentage of processed rows (e.g., 0.03 for 3%)
     */
    approximate(value: AccumulatedValue,
        processed: number,
        numRows: number): ApproximatedInterval;
    toString();
}

export class MinAccumulator implements AccumulatorTrait {
    readonly initPartialValue =
        Object.freeze(new PartialValue(0, 0, 0, Number.MAX_VALUE, 0, 0));

    readonly initAccumulatedValue =
        Object.freeze(new AccumulatedValue(0, 0, 0, Number.MAX_VALUE, 0, 0));

    readonly name = "min";
    readonly alwaysNonNegative = false;
    readonly requireTargetField = false;

    reduce(a: PartialValue, b: number | null) {
        if (isNull(b)) return new PartialValue(0, 0, a.count + 1, a.min, 0, a.nullCount + 1);
        return new PartialValue(0, 0, a.count + 1, Math.min(a.min, b), 0, a.nullCount);
    }

    accumulate(a: AccumulatedValue, b: PartialValue) {
        return new AccumulatedValue(0, 0, a.count + b.count, Math.min(a.min, b.min), 0, a.nullCount + b.nullCount);
    }

    desc(value: AccumulatedValue) {
        return `${value.min} (count=${value.count}, nullCount=${value.nullCount})`;
    }

    approximate(value: AccumulatedValue) {
        return new ApproximatedInterval(value.min, 0, value.count, 0);
    }

    toString() {
        return this.name.toUpperCase();
    }
}

export class MaxAccumulator implements AccumulatorTrait {
    readonly initPartialValue =
        Object.freeze(new PartialValue(0, 0, 0, -Number.MAX_VALUE, 0, 0));

    readonly initAccumulatedValue =
        Object.freeze(new AccumulatedValue(0, 0, 0, -Number.MAX_VALUE, 0, 0));

    readonly name = "max";
    readonly alwaysNonNegative = false;
    readonly requireTargetField = true;

    reduce(a: PartialValue, b: number | null) {
        if (isNull(b)) return new PartialValue(0, 0, a.count + 1, a.max, 0, a.nullCount + 1);
        return new PartialValue(0, 0, a.count + 1, Math.max(a.max, b), 0, a.nullCount);
    }

    accumulate(a: AccumulatedValue, b: PartialValue) {
        return new AccumulatedValue(0, 0, a.count + b.count, Math.max(a.max, b.max), 0, a.nullCount + b.nullCount);
    }

    desc(value: AccumulatedValue) {
        return `${value.max} (count=${value.count}, nullCount=${value.nullCount})`;
    }

    approximate(value: AccumulatedValue) {
        return new ApproximatedInterval(value.max, 0, value.count, 0);
    }

    toString() {
        return this.name.toUpperCase();
    }
}

export class CountAccumulator implements AccumulatorTrait {
    readonly initPartialValue =
        Object.freeze(new PartialValue(0, 0, 0, 0, 0, 0));

    readonly initAccumulatedValue =
        Object.freeze(new AccumulatedValue(0, 0, 0, 0, 0, 0));

    readonly name = "count";
    readonly alwaysNonNegative = true;
    readonly requireTargetField = false;

    reduce(a: PartialValue, b: number | null) {
        if (isNull(b)) return new PartialValue(0, 0, a.count + 1, 0, 0, a.nullCount + 1);
        return new PartialValue(0, 0, a.count + 1, 0, 0, a.nullCount);
    }

    accumulate(a: AccumulatedValue, b: PartialValue) {
        return new AccumulatedValue(0, 0, a.count + b.count, 0, 0, a.nullCount + b.nullCount);
    }

    desc(value: AccumulatedValue) {
        return `${value.count} (count=${value.count}, nullCount=${value.nullCount})`;
    }

    // TODO
    approximate(value: AccumulatedValue, processed: number, numRows: number) {
        const mean = (value.count + 1 - processed) / processed;
        const variance = (value.count + 1) * (1 - processed) / processed;
        const stdev = Math.sqrt(variance);
        const stdem = stdev / Math.sqrt(value.count);

        return new ApproximatedInterval(mean, stdem, value.count, stdev);
    }

    toString() {
        return this.name.toUpperCase();
    }
}

export class SumAccumulator implements AccumulatorTrait {
    readonly initPartialValue =
        Object.freeze(new PartialValue(0, 0, 0, 0, 0, 0));

    readonly initAccumulatedValue =
        Object.freeze(new AccumulatedValue(0, 0, 0, 0, 0, 0));

    readonly name = "sum";
    readonly alwaysNonNegative = false;
    readonly requireTargetField = true;

    reduce(a: PartialValue, b: number | null) {
        if (isNull(b)) return new PartialValue(a.sum, a.ssum, a.count + 1, 0, 0, a.nullCount + 1);
        return new PartialValue(a.sum + b, a.ssum + b * b, a.count + 1, 0, 0, a.nullCount);
    }

    accumulate(a: AccumulatedValue, b: PartialValue) {
        return new AccumulatedValue(a.sum + b.sum, a.ssum + b.ssum, a.count + b.count, 0, 0, a.nullCount + b.nullCount);
    }

    desc(value: AccumulatedValue) {
        return `${value.sum} (count=${value.count}, nullCount=${value.nullCount})`;
    }

    // TODO
    approximate(value: AccumulatedValue, processed: number) {
        let n = value.count - value.nullCount;
        if(n == 1) {
            console.warn('cannot approximation because n = 1, set n to 2');
            n = 2;
        }
        const mean = value.sum / n;

        const variance = value.ssum / n - mean * mean;
        const stdev = Math.sqrt(variance * n / (n - 1));
        const stdem = stdev / Math.sqrt(n);
        const esum = value.sum / processed;
        const estdem = stdem / processed;

        return new ApproximatedInterval(esum, estdem, n, stdev / processed);
    }

    toString() {
        return this.name.toUpperCase();
    }
}

export class MeanAccumulator implements AccumulatorTrait {
    readonly initPartialValue =
        Object.freeze(new PartialValue(0, 0, 0, 0, 0, 0));

    readonly initAccumulatedValue =
        Object.freeze(new AccumulatedValue(0, 0, 0, 0, 0, 0));

    readonly name = "mean";
    readonly alwaysNonNegative = false;
    readonly requireTargetField = true;

    reduce(a: PartialValue, b: number | null) {
        if (isNull(b)) return new PartialValue(a.sum, a.ssum, a.count + 1, 0, 0, a.nullCount + 1);
        return new PartialValue(a.sum + b, a.ssum + b * b, a.count + 1, 0, 0, a.nullCount);
    }

    accumulate(a: AccumulatedValue, b: PartialValue) {
        return new AccumulatedValue(a.sum + b.sum, a.ssum + b.ssum, a.count + b.count, 0, 0, a.nullCount + b.nullCount);
    }

    desc(value: AccumulatedValue) {
        return `${value.sum / value.count} (count=${value.count}, nullCount=${value.nullCount})`;
    }

    // TODO
    approximate(value: AccumulatedValue) {
        const n = value.count - value.nullCount;
        const mean = value.sum / n;
        const variance = value.ssum / n - mean * mean;
        const stdev = Math.sqrt(variance * n / (n - 1));
        const stdem = stdev / Math.sqrt(n);

        return new ApproximatedInterval(mean, stdem, n, stdev);
    }

    toString() {
        return this.name.toUpperCase();
    }
}
