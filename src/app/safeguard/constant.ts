import * as regression from 'regression';
import { NormalDistribution } from './normal';
import { isNull } from 'util';
import { Datum } from '../data/datum';

export type NumberPair = [number, number];
export type NumberTriplet = [number, number, number];

export abstract class ConstantTrait {
    name: string;
}

export class ValueConstant extends ConstantTrait {
    isRank = false;

    constructor(public value: number) {
        super();
    }
}

export class RankConstant extends ConstantTrait {
    isRank = true;

    constructor(public rank: number) {
        super();
    }
}

export class RangeConstant extends ConstantTrait {
    constructor(public from: number, public to: number) {
        super();
        this.checkOrder();
    }

    get range(): NumberPair {
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
        this.checkOrder();
    }

    get range(): NumberPair {
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

/**
 * Something that returns a pdf value
 */
export interface DistributionTrait {
    readonly name: string;
    readonly normalized: boolean;

    compute(left: number, right: number): number;
}

export class PowerLawConstant extends ConstantTrait implements DistributionTrait {
    name = 'power';
    normalized = false;

    // a*x^b
    constructor(public a = 1, public b = 1) {
        super();
    }

    /**
     *
     * @param data (index, y_value) index must start from 1 not 0. y_value will be normalized
     */
    static Fit(data: NumberPair[]) {
        let res = regression.power(data) as {
            equation: NumberPair,
            r2: number
        }

        return new PowerLawConstant(res.equation[0], res.equation[1]);
    }

    static FitFromVisData(data: Datum[]) {
        return this.Fit(
            data
            .map((d, i) => [i + 1, d.ci3.center] as NumberPair)
            .filter(d => d[1] > 0));
    }
    /**
     * returns a pdf value (0 to 1)
     * @param x an index (starts from 1)
     */
    compute(x: number) {
        return this.a * Math.pow(x, this.b);
    }
}

export class NormalConstant extends ConstantTrait implements DistributionTrait {
    name = 'normal';
    normal: NormalDistribution;
    normalized = true;

    constructor(public mean = 0, public stdev = 1) {
        super();

        this.normal = new NormalDistribution(mean, stdev);
    }

    /**
     *
     * @param data [center_of_bin, count_of_bin] count will be normalized.
     */
    static Fit(data: NumberPair[]) {
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

        return new NormalConstant(mean, stdev);
    }

    static FitFromVisData(data: Datum[]) {
        let fitData = data.map(d => {
            let range = d.keys.list[0].value();
            if (range == null) return [0, 0] as NumberPair;
            range = range as NumberPair;
            return [(range[0] + range[1]) / 2, d.ci3.center] as NumberPair;
        });

        return this.Fit(fitData);
    }

    /**
     * returns a pdf value (0 to 1)
     */
    compute(left: number, right: number) {
        let between = (this.normal.cdf(right) - this.normal.cdf(left));
        // console.info(between);
        return between;
    }
}

export class LinearRegressionConstant extends ConstantTrait {
    name = 'linear_regression';

    // ax + b
    constructor(public a = 1, public b = 0) {
        super();
    }

    /**
     *
     * @param data [x, y, count]
     */
    static Fit(data: NumberTriplet[]) {
        let n = 0, x_sum = 0, y_sum = 0, x_squared_sum = 0,
            y_squared_sum = 0, xy_sum = 0;

        data.forEach(d => {
            let x = d[0];
            let y = d[1];
            let count = d[2];

            n += count;

            x_sum += count * x;
            y_sum += count * y;

            x_squared_sum += count * x * x;
            y_squared_sum += count * y * y;
            xy_sum += count * x * y;
        })

        let a = (n * xy_sum - x_sum * y_sum) / (n * x_squared_sum - x_sum * x_sum);
        let b = (y_sum * x_squared_sum - x_sum * xy_sum) / (n * x_squared_sum - x_sum * x_sum);

        return new LinearRegressionConstant(a, b);
    }

    static FitFromVisData(data: Datum[], xKeyIndex: number = 0, yKeyIndex: number = 1) {
        let fitData = data
            .filter(d => d.keys.list[0].value() && d.keys.list[1].value())
            .map(d => {
                let x = (d.keys.list[xKeyIndex].value() as NumberPair)
                let y = (d.keys.list[yKeyIndex].value() as NumberPair);

                if (isNull(x) || isNull(y)) return;

                let cx = (x[0] + x[1]) / 2;
                let cy = (y[0] + y[1]) / 2;
                let count = d.ci3.center;

                return [cx, cy, count] as NumberTriplet;
            })

        return this.Fit(fitData);
    }

    /**
     * returns y value for the given x
     */
    compute(x: number) {
        return this.a * x + this.b;
    }
}
