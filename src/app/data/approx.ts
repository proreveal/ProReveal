const Z95 = 1.96;

export class ConfidenceInterval {
    constructor(public center: number, public stdem: number) {

    }

    ci95() {
        return new CI95(this.center, this.center - Z95 * this.stdem, this.center + Z95 * this.stdem);
    }

    desc() {
        return `${this.center} +- ${this.stdem}`;
    }
}

export class CI95 {
    constructor(public center: number, public low: number, public high: number) {

    }

    desc() {
        return `[${this.low}, ${this.center}, ${this.high}]`;
    }
}
