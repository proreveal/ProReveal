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
