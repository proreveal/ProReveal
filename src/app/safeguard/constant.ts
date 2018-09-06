import * as regression from 'regression';

export abstract class ConstantTrait {

}

export interface Distribution {
    compute(x: number): number;
}

export class PointValueConstant extends ConstantTrait {
    constructor(public value: number) {
        super();
    }
}

export class PointRankConstant extends ConstantTrait {
    constructor(public rank: number) {
        super();
    }
}

export class RangeValueConstant extends ConstantTrait {
    constructor(public from: number, public to: number) {
        super();
    }

    get range(): [number, number] {
        return [this.from, this.to];
    }

    checkOrder() {
        if (this.from > this.to) {
            let temp = this.from;
            this.from = this.to;
            this.to = temp;
        }
    }
}

export class RangeRankConstant extends ConstantTrait {
    constructor(public from: number, public to: number) {
        super();
    }

    get range(): [number, number] {
        return [this.from, this.to];
    }

    checkOrder() {
        if (this.from > this.to) {
            let temp = this.from;
            this.from = this.to;
            this.to = temp;
        }
    }
}

export class PowerLawConstant extends ConstantTrait implements Distribution {
    // a*x^b
    constructor(public a = 1, public b = 1, public r2 = 0.95) {
        super();
    }

    static Regression(data: [number, number][]) {
        let res = regression.power(data) as {
            equation: [number, number],
            r2: number
        }

        return new PowerLawConstant(res.equation[0], res.equation[1]);
    }

    compute(x: number) {
        return this.a * Math.pow(x, this.b);
    }
}

export class GaussianConstant extends ConstantTrait {
    constructor(public mean = 0, public stdev = 1) {
        super();
    }
}
