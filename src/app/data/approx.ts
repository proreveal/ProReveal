import { AccumulatedValue } from "./accum";

const Z95 = 1.96;

export class ApproximatedInterval {
    constructor(public mean: number, public stdem: number, public n: number,
        public stdev: number) {

    }

    ci95() {
        return this.range(Z95);
    }

    range(factor: number) {
        return new ConfidenceInterval(this.mean, this.mean - factor * this.stdem, this.mean + factor * this.stdem);
    }

    desc() {
        return `${this.mean} +- ${this.stdem}`;
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
    approximate(
        value: AccumulatedValue,
        p: number /* percentage of processed rows (e.g., 0.03 for 3%) */,
        n: number /* # of processed */,
        N: number /* # of rows in the dataset */): ApproximatedInterval;
    toString();
}

export class MinApproximator implements ApproximatorTrait {
    approximate(value: AccumulatedValue, p: number, N: number) {
        return new ApproximatedInterval(value.min, 0, value.count, 0);
    }
}

export class MaxApproximator implements ApproximatorTrait {
    approximate(value: AccumulatedValue, p: number, N: number) {
        return new ApproximatedInterval(value.max, 0, value.count, 0);
    }
}

export class CountApproximator implements ApproximatorTrait {
    approximate(value: AccumulatedValue, p: number, N: number) {
        let Ny_bar = N * value.count / N;

        return new ApproximatedInterval(value.max, 0, value.count, 0);
    }
}


export class MeanApproximator implements ApproximatorTrait {
    approximate(value: AccumulatedValue, p: number, N: number) {
        let Ny_bar = N * value.count / N;

        return new ApproximatedInterval(value.max, 0, value.count, 0);
    }
}


export class SumApproximator implements ApproximatorTrait {
    approximate(value: AccumulatedValue, p: number, N: number) {
        let Ny_bar = N * value.count / N;

        return new ApproximatedInterval(value.max, 0, value.count, 0);
    }
}

