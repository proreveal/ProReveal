import * as regression from 'regression';
import { NormalDistribution } from './normal';

export enum FittingTypes {
    PowerLaw,
    Gaussian
}

export abstract class ConstantTrait {

}

export interface Distribution {
    compute(left:number, right: number): number;
}

export class PointValueConstant extends ConstantTrait {
    isRank = false;

    constructor(public value: number) {
        super();
    }
}

export class PointRankConstant extends ConstantTrait {
    isRank = true;

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

export class GaussianConstant extends ConstantTrait implements Distribution {
    normal: NormalDistribution;

    constructor(public n, public mean = 0, public stdev = 1) {
        super();

        this.normal = new NormalDistribution(mean, stdev);
    }

    /**
     *
     * @param data [center_of_bin, count_of_bin][]
     */
    static Regression(data: [number, number][]) {
        let n = 0;
        let sum = 0;
        data.forEach(d => {
            n += d[1];
            sum += d[0] * d[1];
        });

        let mean = sum / n;

        let ssum = 0;

        data.forEach(d => {
            ssum += (mean - d[0]) * (mean - d[0]) * d[1];
        })

        let vari = ssum / n;
        let stdev = Math.sqrt(vari);

        return new GaussianConstant(n, mean, stdev);
    }

    compute(left: number, right:number) {
        let between = (this.normal.cdf(right) - this.normal.cdf(left));
        // console.log(left, right, between);
        return between  * this.n;
    }
}
