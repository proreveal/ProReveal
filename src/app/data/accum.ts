import { isNull } from 'util';
import { ApproximatedInterval, MinApproximator } from './approx';

/**
 * indicates a unit value of a specific category.
 * By default, we compute count, sum, ssum of Y by X.
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

    clone() {
        return new AccumulatedValue(this.sum, this.ssum, this.count, this.min, this.max, this.nullCount);
    }
}

export interface AccumulatorTrait {
    readonly initPartialValue: PartialValue;
    readonly initAccumulatedValue: AccumulatedValue;
    readonly name: string;
    readonly alwaysNonNegative: boolean;
    readonly requireTargetField: boolean;

    reduce(a: PartialValue, b: number | null): PartialValue;
    accumulate(a: AccumulatedValue, b: PartialValue): AccumulatedValue;
    desc(value: AccumulatedValue): string;

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

    toString() {
        return this.name.toUpperCase();
    }
}

export class MaxAccumulator implements AccumulatorTrait {
    readonly initPartialValue =
        Object.freeze(new PartialValue(0, 0, 0, 0, -Number.MAX_VALUE, 0));

    readonly initAccumulatedValue =
        Object.freeze(new AccumulatedValue(0, 0, 0, 0, -Number.MAX_VALUE, 0));

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

    toString() {
        return this.name.toUpperCase();
    }
}

export class AllAccumulator implements AccumulatorTrait {
    readonly initPartialValue =
        Object.freeze(new PartialValue(0, 0, 0, Number.MAX_VALUE, -Number.MAX_VALUE, 0));

    readonly initAccumulatedValue =
        Object.freeze(new AccumulatedValue(0, 0, 0, Number.MAX_VALUE, -Number.MAX_VALUE, 0));

    readonly name = "all";
    readonly alwaysNonNegative = false;
    readonly requireTargetField = true;

    reduce(a: PartialValue, b: number | null) {
        if (isNull(b)) return new PartialValue(a.sum, a.ssum, a.count + 1, a.min, a.max, a.nullCount + 1);
        return new PartialValue(a.sum + b, a.ssum + b * b, a.count + 1, Math.min(a.min, b), Math.max(a.max, b), a.nullCount);
    }

    accumulate(a: AccumulatedValue, b: PartialValue) {
        return new AccumulatedValue(a.sum + b.sum, a.ssum + b.ssum, a.count + b.count, Math.min(a.min, b.min), Math.max(a.max, b.max), a.nullCount + b.nullCount);
    }

    desc(value: AccumulatedValue) {
        return `${value.sum / value.count} (count=${value.count}, nullCount=${value.nullCount}, min=${value.min}, max=${value.max})`;
    }

    toString() {
        return this.name.toUpperCase();
    }
}
