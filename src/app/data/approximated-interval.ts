import { ConfidenceInterval, EmptyConfidenceInterval, ConfidencePoint } from "./confidence-interval";

const Z95 = 1.96;

export class ApproximatedInterval {
    constructor(public center: number, public stdev: number, public n: number) {
    }

    ci95() {
        return this.range(Z95);
    }

    range(factor: number) {
        if(this == EmptyApproximatedInterval) return EmptyConfidenceInterval;
        return new ConfidenceInterval(this.center, this.stdev, this.center - factor * this.stdev, this.center + factor * this.stdev);
    }

    desc() {
        return `${this.center} +- ${this.stdev}`;
    }
}

export class ApproximatedPoint extends ApproximatedInterval {
    constructor(public center: number, public n: number) {
        super(center, 0, n);
    }

    range(factor: number) {
        return new ConfidencePoint(this.center);
    }
}

export const EmptyApproximatedInterval = new ApproximatedInterval(0, 0, 0);

