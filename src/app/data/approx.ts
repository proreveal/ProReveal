import { AccumulatedValue } from "./accum";
import { ApproximatedInterval, EmptyApproximatedInterval } from "./approximated-interval";

export interface ApproximatorTrait {
    readonly name: string;
    readonly alwaysNonNegative: boolean;
    readonly requireTargetField: boolean;
    readonly estimatable: boolean;

    approximate(
        value: AccumulatedValue,
        p: number /* percentage of processed rows (e.g., 0.03 for 3%) */,
        n: number /* # of processed */,
        N: number /* # of rows in the dataset */): ApproximatedInterval;
    toString();
}

export abstract class Approximator {
    static FromName(name: string) {
        name = name.toLowerCase();
        if(name === 'sum') return new SumApproximator();
        if(name === 'mean') return new MeanApproximator();
        if(name === 'min') return new MinApproximator();
        if(name === 'max') return new MaxApproximator();

        throw new Error(`Unknown approximator name ${name}`);
    }
}

export class MinApproximator implements ApproximatorTrait {
    name = 'Min';
    alwaysNonNegative = false;
    requireTargetField = true;
    estimatable = false;

    approximate(value: AccumulatedValue, p: number, n: number, N: number) {
        if(value.min === Number.MAX_VALUE) return new ApproximatedInterval(0, 0, 0);
        return new ApproximatedInterval(value.min, 0, value.count);
    }
}

export class MaxApproximator implements ApproximatorTrait {
    name = 'Max';
    alwaysNonNegative = false;
    requireTargetField = true;
    estimatable = false;

    approximate(value: AccumulatedValue, p: number, n: number, N: number) {
        if(value.max === -Number.MAX_VALUE) return new ApproximatedInterval(0, 0, 0);
        return new ApproximatedInterval(value.max, 0, value.count);
    }
}

export class CountApproximator implements ApproximatorTrait {
    name = 'Count';
    alwaysNonNegative = true;
    requireTargetField = false;
    estimatable = true;

    approximate(value: AccumulatedValue, p: number, n: number, N: number) {
        let n1 = value.count - value.nullCount;
        let Ny_bar = N * n1 / n;
        if(n == 0) return EmptyApproximatedInterval;
        if(n == 1) return new ApproximatedInterval(Ny_bar, 0, n1); // TODO
        let s_squared = n1 * (n - n1) / n / (n - 1);
        let s = Math.sqrt(s_squared);

        return new ApproximatedInterval(Ny_bar, Math.sqrt(N * (N - n)) * s / Math.sqrt(n), n1);
    }
}

export class MeanApproximator implements ApproximatorTrait {
    name = 'Mean';
    alwaysNonNegative = true;
    requireTargetField = true;
    estimatable = true;

    approximate(value: AccumulatedValue, p: number, n: number, N: number) {
        let n1 = value.count - value.nullCount;
        if(n1 == 0) return EmptyApproximatedInterval;
        let X_bar = value.sum / n1;
        if(n1 == 1) return new ApproximatedInterval(X_bar, 0, n1); // TODO
        let s_squared = (value.ssum - n1 * X_bar * X_bar) / (n1 - 1);
        let s = Math.sqrt(s_squared);

        return new ApproximatedInterval(X_bar, Math.sqrt(1 - n / N) * s / Math.sqrt(n1), n1);
    }
}


export class SumApproximator implements ApproximatorTrait {
    name = 'Sum';
    alwaysNonNegative = true;
    requireTargetField = true;
    estimatable = true;

    approximate(value: AccumulatedValue, p: number, n: number, N: number) {
        let n1 = value.count - value.nullCount;
        if(n1 == 0) return EmptyApproximatedInterval;

        let N1_hat = N * n1 / n;

        let X_bar = value.sum / n1;

        if(n1 == 1) return new ApproximatedInterval(X_bar, 0, n1);

        let s_squared = (value.ssum - n1 * X_bar * X_bar) / (n1 - 1);
        let s = Math.sqrt(s_squared);

        return new ApproximatedInterval(X_bar * N1_hat, Math.sqrt(N * (N - n) * n1 / n) * s / Math.sqrt(n), n1);
    }
}

