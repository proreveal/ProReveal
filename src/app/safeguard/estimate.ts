import { NormalDistribution } from "./normal";
import { AggregateQuery } from "../data/query";
import { SingleVariable, VariablePair, VariableTrait, CombinedVariablePair } from "./variable";
import { Operators } from "./operator";
import { ApproximatedInterval } from "../data/approx";
import { ValueConstant, RankConstant, RangeConstant, RangeRankConstant, PowerLawConstant, NormalConstant, LinearRegressionConstant } from "./constant";
import { isNull } from "util";
import { Validity, PValue, Truthiness, Quality, Error } from "./validity";
import { isFulfilled } from "q";

const normal = new NormalDistribution();

/**
 * checks if ai1 > ai2
 * @param ai1
 * @param ai2
 */
export function estimateTwoConfidenceIntervals(ai1: ApproximatedInterval, ai2: ApproximatedInterval, n: number, N: number): PValue {
    const s_star_sqaured = ai1.stdev * ai1.stdev / ai1.n + ai2.stdev * ai2.stdev / ai2.n;
    // TODO n == N
    const s_star = Math.sqrt(1 - n / N) * Math.sqrt(s_star_sqaured);

    const diff = ai1.center - ai2.center;

    let z = diff / s_star;
    let cp = normal.cdf(z);

    return cp;
}

export interface EstimatorTrait {
    estimate(...args: any[]): Validity;
}

export class ValueEstimator implements EstimatorTrait {
    estimate(query: AggregateQuery, variable: VariableTrait,
        operator: Operators, constant: ValueConstant): PValue {

        let result = query.visibleData.find(d => d.keys.hash == variable.hash).accumulatedValue;
        let ai = query.approximator.approximate(
            result,
            query.visibleProgress.processedPercent(),
            query.visibleProgress.processedRows,
            query.visibleProgress.totalRows);

        if(ai.stdev === 0) return 0; // always true since we automatically set the direction of > and <

        let z = (constant.value - ai.center) / ai.stdev;
        let cp = normal.cdf(z);

        if (operator == Operators.GreaterThan || operator == Operators.GreaterThanOrEqualTo)
            return cp;
        else if (operator == Operators.LessThan || operator == Operators.LessThanOrEqualTo)
            return 1 - cp;
        else
            throw new Error(`Invalid operator ${operator}`);
    }
}

export class RankEstimator implements EstimatorTrait {
    estimate(query: AggregateQuery, variable: VariableTrait,
        operator: Operators, constant: RankConstant): PValue {
        const n = query.visibleProgress.processedRows;
        const N = query.visibleProgress.totalRows;

        let results: [string, ApproximatedInterval][] = Object.keys(query.visibleResult).map((hash) => {
            let result = query.visibleResult[hash];
            let ai = query.approximator.approximate(
                result.value,
                query.visibleProgress.processedPercent(),
                query.visibleProgress.processedRows,
                query.visibleProgress.totalRows
            );

            return [hash, ai] as [string, ApproximatedInterval];
        })

        results = results.filter(d => !query.visibleResult[d[0]].key.hasNullValue());

        let categoryN = results.length;

        let probs = new Array(categoryN - 1); // the probability of V_i > V_target
        let targetInterval = results.filter(res => res[0] == variable.hash)[0][1];

        results.filter(res => res[0] != variable.hash).forEach((res, i) => {
            let ai = res[1];
            probs[i] = estimateTwoConfidenceIntervals(ai, targetInterval, n, N);
        })

        let T = [];
        for (let i = 0; i < categoryN; i++) T.push(new Array(categoryN + 1).fill(0));

        // T[i][j] = probability of having j categories among i categories that are larger than targetInterval
        T[0][0] = 1;
        T[0][1] = 0;

        for (let i = 1; i < categoryN; i++) {
            for (let j = 0; j <= i; j++) {
                T[i][j] = T[i - 1][j] * (1 - probs[i - 1]) +
                    (j >= 1 ? T[i - 1][j - 1] * probs[i - 1] : 0);
            }
        }

        function sum(arr: number[]) { return arr.reduce((p, c) => p + c, 0); }

        if (operator == Operators.GreaterThan) return 1 - sum(T[categoryN - 1].slice(constant.rank));
        else if (operator == Operators.GreaterThanOrEqualTo) return 1 - sum(T[categoryN - 1].slice(constant.rank - 1));
        else if (operator == Operators.LessThan) return 1 - sum(T[categoryN - 1].slice(0, constant.rank + 1));
        else if (operator == Operators.LessThanOrEqualTo) return 1 - sum(T[categoryN - 1].slice(0, constant.rank));
        else throw new Error(`Invalid operator ${operator}`);
    }
}

export class MinMaxValueEstimator implements EstimatorTrait {
    estimate(query: AggregateQuery, variable: VariableTrait,
        operator: Operators, constant: ValueConstant): Truthiness {
        let result = query.visibleData.find(d => d.keys.hash == variable.hash).accumulatedValue;
        let ai = query.approximator.approximate(
            result,
            query.visibleProgress.processedPercent(),
            query.visibleProgress.processedRows,
            query.visibleProgress.totalRows);

        if (operator == Operators.GreaterThan)
            return ai.center > constant.value;
        else if(operator == Operators.GreaterThanOrEqualTo)
            return ai.center >= constant.value;
        else if (operator == Operators.LessThan)
            return ai.center < constant.value;
        else if(operator == Operators.LessThanOrEqualTo)
            return ai.center <= constant.value;
        else
            throw new Error(`Invalid operator ${operator}`);
    }
}

export class MinMaxRankValueEstimator implements EstimatorTrait {
    estimate(query: AggregateQuery, variable: VariableTrait,
        operator: Operators, constant: RankConstant): Truthiness {

        let results: [string, ApproximatedInterval][] = Object.keys(query.visibleResult)
        .map((hash) => {
            let result = query.visibleResult[hash];
            let ai = query.approximator.approximate(
                result.value,
                query.visibleProgress.processedPercent(),
                query.visibleProgress.processedRows,
                query.visibleProgress.totalRows
            );

            return [hash, ai] as [string, ApproximatedInterval];
        })

        results.sort((a, b) => b[1].center - a[1].center);
        let rank = results.findIndex(d => d[0] === variable.hash);


        rank += 1; // 1 ~ N
        if (rank <= 0) return false;

        if (operator == Operators.GreaterThan)
            return rank > constant.rank;
        else if(operator == Operators.GreaterThanOrEqualTo)
            return rank >= constant.rank;
        else if (operator == Operators.LessThan)
            return rank < constant.rank;
        else if(operator == Operators.LessThanOrEqualTo)
            return rank <= constant.rank;
        else
            throw new Error(`Invalid operator ${operator}`);
    }
}

export class RangeEstimator implements EstimatorTrait {
    estimate(query: AggregateQuery, variable: VariableTrait,
        operator: Operators, constant: RangeConstant): PValue {

        let result = query.visibleData.find(d => d.keys.hash == variable.hash).accumulatedValue;
        let ai = query.approximator.approximate(
            result,
            query.visibleProgress.processedPercent(),
            query.visibleProgress.processedRows,
            query.visibleProgress.totalRows);

        if(ai.stdev == 0) return 0; // no uncertainty

        let zLeft = (constant.from - ai.center) / ai.stdev;
        let zRight = (constant.to - ai.center) / ai.stdev;

        let cp = normal.cdf(zRight) - normal.cdf(zLeft);

        if (operator == Operators.InRange) return 1 - cp;
        else if (operator == Operators.NotInRange) return cp;
        else throw new Error(`Invalid operator ${operator}`);
    }
}

export class RangeRankEstimator implements EstimatorTrait {
    estimate(query: AggregateQuery, variable: VariableTrait,
        operator: Operators, constant: RangeRankConstant): Truthiness {

        let results: [string, ApproximatedInterval][] = Object.keys(query.visibleResult).map((hash) => {
            let result = query.visibleResult[hash];
            let ai = query.approximator.approximate(
                result.value,
                query.visibleProgress.processedPercent(),
                query.visibleProgress.processedRows,
                query.visibleProgress.totalRows
            );

            return [hash, ai] as [string, ApproximatedInterval];
        })

        results.sort((a, b) => a[1].center - b[1].center);
        let rank = results.findIndex(d => d[0] === variable.hash);

        rank += 1; // 1 ~ N

        if (rank <= 0) return false;

        if (operator == Operators.InRange) return constant.from <= rank && rank <= constant.to;
        else throw new Error(`Invalid operator ${operator}`);
    }
}

export class ComparativeEstimator implements EstimatorTrait {
    estimate(query: AggregateQuery, variable: VariablePair | CombinedVariablePair,
        operator: Operators): PValue {
        const n = query.visibleProgress.processedRows;
        const N = query.visibleProgress.totalRows;

        let result1 = query.visibleData.find(d => d.keys.hash == variable.first.hash).accumulatedValue;
        let result2 = query.visibleData.find(d => d.keys.hash == variable.second.hash).accumulatedValue;

        let ai1 = query.approximator.approximate(
            result1,
            query.visibleProgress.processedPercent(),
            n,
            N);

        let ai2 = query.approximator.approximate(
            result2,
            query.visibleProgress.processedPercent(),
            n,
            N);

        let cp = estimateTwoConfidenceIntervals(ai1, ai2, n, N);

        if (operator == Operators.GreaterThan || operator == Operators.GreaterThanOrEqualTo)
            return 1 - cp;
        else if (operator == Operators.LessThan || operator == Operators.LessThanOrEqualTo)
            return cp;
        else
            throw new Error(`Invalid operator ${operator}`);
    }
}

export class PowerLawEstimator implements EstimatorTrait {
    /**
     *
     * @param query query must use the count aggregate function
     * @param variable must be a single variable (e.g., we do not support
     * (MEAN(Y) by X) ~ N(mu, sigma))
     * @param constant
     */
    estimate(query: AggregateQuery, constant: PowerLawConstant): Quality {
        let data = query.getVisibleData();
        let n = 0;

        data.forEach(datum => {
            n += datum.ci3.center;
        });

        let diff = 0;
        data.forEach((datum, i) => {
            let p_true = datum.ci3.center / n;
            let p_estimate = constant.compute(i + 1) / n;

            if (diff < Math.abs(p_true - p_estimate))
                diff = Math.abs(p_true - p_estimate);
        })

        return diff;
    }
}

// export function KSSignificance(lambda: number): number {
//     let res = 0;
//     let sign = 1;
//     for(let j = 1; j <= 100;++j) {
//         res += 2 * sign * Math.exp(-2 * j * j * lambda * lambda);
//         sign *= -1;
//     }

//     return res;
// }

export class NormalEstimator implements EstimatorTrait {
    /**
     *
     * @param query query must use the count aggregate function
     * @param variable must be a single variable (e.g., we do not support
     * (MEAN(Y) by X) ~ N(mu, sigma))
     * @param constant
     */
    estimate(query: AggregateQuery, constant: NormalConstant): Quality {
        let data = query.getVisibleData();
        let n = 0;
        let observed = [], expected = [];

        data.forEach(datum => {
            let range = datum.keys.list[0].value();
            if (isNull(range)) return; // means a count for an empty value
            n += datum.ci3.center;
        });

        let diff = 0;
        let cd = 0; // cumulative density
        let prevCd = 0;
        data.forEach((datum, i) => {
            let observedP = datum.ci3.center / n;
            let range = datum.keys.list[0].value();
            if (isNull(range)) return; // means a count for an empty value

            let [left, right] = range as [number, number];

            cd += observedP;
            let expectedCD = constant.compute(-100, right);

            if (diff < Math.abs(cd - expectedCD))
                diff = Math.abs(cd - expectedCD);

            if(diff < Math.abs(prevCd - expectedCD))
                diff = Math.abs(prevCd - expectedCD);
            prevCd = cd;
        })
        // let sqrtN = Math.sqrt(n);
        // let ks = (sqrtN + 0.12 + 0.11 / sqrtN) * diff;

        // console.log(0, KSSignificance(0));
        // console.log(0.1, KSSignificance(0.1));
        // console.log(0.2, KSSignificance(0.2));
        // console.log(0.3, KSSignificance(0.3));
        // console.log(0.4, KSSignificance(0.4));
        // console.log(0.5, KSSignificance(0.5));
        // console.log(ks, KSSignificance(ks));
        // var k = new jerzy.Kolmogorov();

// console.log(k, k.distr(ks));

        return diff;
    }
}

export class LinearRegressionEstimator {
    estimate(query: AggregateQuery, constant: LinearRegressionConstant): Error {

        let data = query.getVisibleData();
        let n = 0;
        let error = 0;

        data.forEach(datum => {
            let range1 = datum.keys.list[0].value();
            let range2 = datum.keys.list[1].value();

            if (isNull(range1) || isNull(range2)) return;

            range1 = range1 as [number, number];
            range2 = range2 as [number, number];

            let x = (range1[0] + range1[1]) / 2;
            let y = (range2[0] + range2[1]) / 2;

            let y_estimate = constant.compute(x);

            n += datum.ci3.center;
            error += (y - y_estimate) * (y - y_estimate) * datum.ci3.center;
        })

        return Math.sqrt(error / n);
    }
}
