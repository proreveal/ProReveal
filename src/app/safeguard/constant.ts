import * as regression from 'regression';

export abstract class ConstantTrait {

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
    constructor(public from: number, public to: number ) {
        super();
    }

    get range(): [number, number]  {
        return [this.from, this.to];
    }

    checkOrder() {
        if(this.from > this.to) {
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
        if(this.from > this.to) {
            let temp = this.from;
            this.from = this.to;
            this.to = temp;
        }
    }
}

export class PowerLawConstant extends ConstantTrait {
    // a*x^b
    constructor(public a = 1, public b = 1) {
        super();
    }

    static Regression(data: [number, number][]) {
        console.log(regression.power(data));
    }
}

export class GaussianConstant extends ConstantTrait {
    constructor(public mean = 0, public stdev = 1) {
        super();
    }
}
