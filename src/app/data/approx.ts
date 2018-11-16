import { AccumulatedValue } from "./accum";

const Z95 = 1.96;

export class ApproximatedInterval {
    constructor(public center: number, public stdev: number, public n: number,
        public stdev2: number) {
    }

    ci95() {
        return this.range(Z95);
    }

    range(factor: number) {
        return new ConfidenceInterval(this.center, this.center - factor * this.stdev, this.center + factor * this.stdev);
    }

    desc() {
        return `${this.center} +- ${this.stdev}`;
    }
}

export class ConfidenceInterval {
    constructor(public center: number, public low: number, public high: number) {

    }

    desc() {
        return `[${this.low}, ${this.center}, ${this.high}]`;
    }
}

export interface ApproximatorTrait {
    readonly name: string;
    readonly alwaysNonNegative: boolean;
    readonly requireTargetField: boolean;

    approximate(
        value: AccumulatedValue,
        p: number /* percentage of processed rows (e.g., 0.03 for 3%) */,
        n: number /* # of processed */,
        N: number /* # of rows in the dataset */): ApproximatedInterval;
    toString();
}

export class MinApproximator implements ApproximatorTrait {
    name = 'min';
    alwaysNonNegative = false;
    requireTargetField = true;

    approximate(value: AccumulatedValue, p: number, n: number, N: number) {
        return new ApproximatedInterval(value.min, 0, value.count, 0);
    }
}

export class MaxApproximator implements ApproximatorTrait {
    name = 'max';
    alwaysNonNegative = false;
    requireTargetField = true;

    approximate(value: AccumulatedValue, p: number, n: number, N: number) {
        return new ApproximatedInterval(value.max, 0, value.count, 0);
    }
}

export class CountApproximator implements ApproximatorTrait {
    name = 'count';
    alwaysNonNegative = true;
    requireTargetField = false;

    approximate(value: AccumulatedValue, p: number, n: number, N: number) {
        let n1 = value.count - value.nullCount;
        let Ny_bar = N * n1 / n;
        let s_squared = n1 * (n - n1) / n / (n - 1);
        let s = Math.sqrt(s_squared);

        return new ApproximatedInterval(Ny_bar, Math.sqrt(N * (N - n)) * s / Math.sqrt(n), n1, 0);
    }
}

export class MeanApproximator implements ApproximatorTrait {
    name = 'mean';
    alwaysNonNegative = true;
    requireTargetField = true;

    approximate(value: AccumulatedValue, p: number, n: number, N: number) {
        let n1 = value.count - value.nullCount;
        if(n1 == 1) n1 = 2;
        let X_bar = value.sum / n1;
        let s_squared = (value.ssum - n1 * X_bar * X_bar) / (n1 - 1);
        let s = Math.sqrt(s_squared);

        return new ApproximatedInterval(X_bar, Math.sqrt(1 - n / N) * s / Math.sqrt(n1), n1, 0);
    }
}


export class SumApproximator implements ApproximatorTrait {
    name = 'sum';
    alwaysNonNegative = true;
    requireTargetField = true;

    approximate(value: AccumulatedValue, p: number, n: number, N: number) {
        let n1 = value.count - value.nullCount;
        if(n1 == 1) n1 = 2;
        let N1_hat = N * n1 / n;

        let X_bar = value.sum / n1;
        let s_squared = (value.ssum - n1 * X_bar * X_bar) / (n1 - 1);
        let s = Math.sqrt(s_squared);

        return new ApproximatedInterval(X_bar * N1_hat, Math.sqrt(N * (N - n) * n1 / n) * s / Math.sqrt(n), n1, 0);
    }
}

