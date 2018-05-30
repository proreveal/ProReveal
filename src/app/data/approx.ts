const Z95 = 1.96;

export class ApproximatedInterval {
    constructor(public center: number, public stdem: number) {

    }

    ci95() {
        return this.range(Z95);
    }

    range(factor: number) {
        return new ConfidenceInterval(this.center, this.center - factor * this.stdem, this.center + factor * this.stdem);
    }

    desc() {
        return `${this.center} +- ${this.stdem}`;
    }
}

export class ConfidenceInterval {
    constructor(public center: number, public low: number, public high: number) {

    }

    desc() {
        return `[${this.low}, ${this.center}, ${this.high}]`;
    }
}
