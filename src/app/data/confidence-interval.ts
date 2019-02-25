export class ConfidenceInterval {
    constructor(public center: number, public stdev: number, public low: number, public high: number) {

    }

    desc() {
        return `[${this.low}, ${this.center}, ${this.high}]`;
    }

    toLog() {
        return {
            center: this.center,
            stdev: this.stdev,
            low: this.low,
            high: this.high
        };
    }
}

export const EmptyConfidenceInterval = new ConfidenceInterval(0, 0, 0, 0);
