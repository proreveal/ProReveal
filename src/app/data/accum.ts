import { isNull } from 'util';

/**
 * indicates a unit value of a specific category.
 * By default, we compute count, sum, ssum of Y by X.
 */
export class AggregateValue {
    constructor(public sum: number,
        public ssum: number,
        public count: number,
        public min: number,
        public max: number,
        public nullCount: number) {
    }

    clone() {
        return new AggregateValue(this.sum, this.ssum, this.count, this.min, this.max, this.nullCount);
    }

    toLog(){
        return {
            sum: this.sum,
            ssum: this.ssum,
            count: this.count,
            min: this.min,
            max: this.max,
            nullCount: this.nullCount
        }
    }
}

export interface AccumulatorTrait {
    readonly initPartialValue: AggregateValue;
    readonly initAccumulatedValue: AggregateValue;
    readonly name: string;

    reduce(a: AggregateValue, b: number | null): AggregateValue;
    accumulate(a: AggregateValue, b: AggregateValue): AggregateValue;
    desc(value: AggregateValue): string;

    toString();
}

export class MinAccumulator implements AccumulatorTrait {
    readonly initPartialValue =
        Object.freeze(new AggregateValue(0, 0, 0, Number.MAX_VALUE, 0, 0));

    readonly initAccumulatedValue =
        Object.freeze(new AggregateValue(0, 0, 0, Number.MAX_VALUE, 0, 0));

    readonly name = "min";
    readonly alwaysNonNegative = false;

    reduce(a: AggregateValue, b: number | null) {
        if (isNull(b)) return new AggregateValue(0, 0, a.count + 1, a.min, 0, a.nullCount + 1);
        return new AggregateValue(0, 0, a.count + 1, Math.min(a.min, b), 0, a.nullCount);
    }

    accumulate(a: AggregateValue, b: AggregateValue) {
        return new AggregateValue(0, 0, a.count + b.count, Math.min(a.min, b.min), 0, a.nullCount + b.nullCount);
    }

    desc(value: AggregateValue) {
        return `${value.min} (count=${value.count}, nullCount=${value.nullCount})`;
    }

    toString() {
        return this.name.toUpperCase();
    }
}

export class MaxAccumulator implements AccumulatorTrait {
    readonly initPartialValue =
        Object.freeze(new AggregateValue(0, 0, 0, 0, -Number.MAX_VALUE, 0));

    readonly initAccumulatedValue =
        Object.freeze(new AggregateValue(0, 0, 0, 0, -Number.MAX_VALUE, 0));

    readonly name = "max";

    reduce(a: AggregateValue, b: number | null) {
        if (isNull(b)) return new AggregateValue(0, 0, a.count + 1, a.max, 0, a.nullCount + 1);
        return new AggregateValue(0, 0, a.count + 1, Math.max(a.max, b), 0, a.nullCount);
    }

    accumulate(a: AggregateValue, b: AggregateValue) {
        return new AggregateValue(0, 0, a.count + b.count, Math.max(a.max, b.max), 0, a.nullCount + b.nullCount);
    }

    desc(value: AggregateValue) {
        return `${value.max} (count=${value.count}, nullCount=${value.nullCount})`;
    }

    toString() {
        return this.name.toUpperCase();
    }
}

export class CountAccumulator implements AccumulatorTrait {
    readonly initPartialValue =
        Object.freeze(new AggregateValue(0, 0, 0, 0, 0, 0));

    readonly initAccumulatedValue =
        Object.freeze(new AggregateValue(0, 0, 0, 0, 0, 0));

    readonly name = "count";

    reduce(a: AggregateValue, b: number | null) {
        if (isNull(b)) return new AggregateValue(0, 0, a.count + 1, 0, 0, a.nullCount + 1);
        return new AggregateValue(0, 0, a.count + 1, 0, 0, a.nullCount);
    }

    accumulate(a: AggregateValue, b: AggregateValue) {
        return new AggregateValue(0, 0, a.count + b.count, 0, 0, a.nullCount + b.nullCount);
    }

    desc(value: AggregateValue) {
        return `${value.count} (count=${value.count}, nullCount=${value.nullCount})`;
    }

    toString() {
        return this.name.toUpperCase();
    }
}

export class SumAccumulator implements AccumulatorTrait {
    readonly initPartialValue =
        Object.freeze(new AggregateValue(0, 0, 0, 0, 0, 0));

    readonly initAccumulatedValue =
        Object.freeze(new AggregateValue(0, 0, 0, 0, 0, 0));

    readonly name = "sum";

    reduce(a: AggregateValue, b: number | null) {
        if (isNull(b)) return new AggregateValue(a.sum, a.ssum, a.count + 1, 0, 0, a.nullCount + 1);
        return new AggregateValue(a.sum + b, a.ssum + b * b, a.count + 1, 0, 0, a.nullCount);
    }

    accumulate(a: AggregateValue, b: AggregateValue) {
        return new AggregateValue(a.sum + b.sum, a.ssum + b.ssum, a.count + b.count, 0, 0, a.nullCount + b.nullCount);
    }

    desc(value: AggregateValue) {
        return `${value.sum} (count=${value.count}, nullCount=${value.nullCount})`;
    }

    toString() {
        return this.name.toUpperCase();
    }
}

export class MeanAccumulator implements AccumulatorTrait {
    readonly initPartialValue =
        Object.freeze(new AggregateValue(0, 0, 0, 0, 0, 0));

    readonly initAccumulatedValue =
        Object.freeze(new AggregateValue(0, 0, 0, 0, 0, 0));

    readonly name = "mean";

    reduce(a: AggregateValue, b: number | null) {
        if (isNull(b)) return new AggregateValue(a.sum, a.ssum, a.count + 1, 0, 0, a.nullCount + 1);
        return new AggregateValue(a.sum + b, a.ssum + b * b, a.count + 1, 0, 0, a.nullCount);
    }

    accumulate(a: AggregateValue, b: AggregateValue) {
        return new AggregateValue(a.sum + b.sum, a.ssum + b.ssum, a.count + b.count, 0, 0, a.nullCount + b.nullCount);
    }

    desc(value: AggregateValue) {
        return `${value.sum / value.count} (count=${value.count}, nullCount=${value.nullCount})`;
    }

    toString() {
        return this.name.toUpperCase();
    }
}

export class AllAccumulator implements AccumulatorTrait {
    readonly initPartialValue =
        Object.freeze(new AggregateValue(0, 0, 0, Number.MAX_VALUE, -Number.MAX_VALUE, 0));

    readonly initAccumulatedValue =
        Object.freeze(new AggregateValue(0, 0, 0, Number.MAX_VALUE, -Number.MAX_VALUE, 0));

    readonly name = "all";

    reduce(a: AggregateValue, b: number | null) {
        if (isNull(b)) return new AggregateValue(a.sum, a.ssum, a.count + 1, a.min, a.max, a.nullCount + 1);
        return new AggregateValue(a.sum + b, a.ssum + b * b, a.count + 1, Math.min(a.min, b), Math.max(a.max, b), a.nullCount);
    }

    accumulate(a: AggregateValue, b: AggregateValue) {
        return new AggregateValue(a.sum + b.sum, a.ssum + b.ssum, a.count + b.count, Math.min(a.min, b.min), Math.max(a.max, b.max), a.nullCount + b.nullCount);
    }

    desc(value: AggregateValue) {
        return `${value.sum / value.count} (count=${value.count}, nullCount=${value.nullCount}, min=${value.min}, max=${value.max})`;
    }

    toString() {
        return this.name.toUpperCase();
    }
}
