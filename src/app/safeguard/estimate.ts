import { NormalDistribution } from "./normal";
import { AggregateQuery } from "../data/query";
import { Variable, VariablePair } from "./variable";
import { Operators } from "./operator";
import { ApproximatedInterval } from "../data/approx";
import { PointValueConstant, PointRankConstant, RangeValueConstant, RangeRankConstant, DistributionTrait, PowerLawConstant, NormalConstant, LinearRegressionConstant } from "./constant";
import { FieldGroupedValue } from "../data/field";
import { NullGroupId } from "../data/grouper";
import { isNull } from "util";

export type PValue = number; // 0 <= p <= 1
export type Quality = number;  // 0 <= quality <= 1
export type Error = number; // 0 <= error
export type Truthness = boolean;

export type EstimationResult = PValue | Quality | Error | Truthness;

const normal = new NormalDistribution();

export interface EstimatorTrait {
    estimate(...args: any[]): EstimationResult;
}

export class PointValueEstimator implements EstimatorTrait {
    estimate(query: AggregateQuery, variable: Variable,
        operator: Operators, constant: PointValueConstant): PValue {
        let result = query.result[variable.fieldGroupedValue.hash].value;
        let ai = query.approximator.approximate(
            result,
            query.progress.processedPercent(),
            query.progress.processedRows,
            query.progress.totalRows);
        let z = (constant.value - ai.center) / ai.stdev;
        let cp = normal.cdf(z);
        if (operator == Operators.GreaterThan || operator == Operators.GreaterThanOrEqualTo)
            return 1 - cp;
        else if (operator == Operators.LessThan || operator == Operators.LessThanOrEqualTo)
            return cp;
        else
            throw new Error(`Invalid operator ${operator}`);
    }
}

export class PointRankEstimator implements EstimatorTrait {
    estimate(query: AggregateQuery, variable: Variable,
        operator: Operators, constant: PointRankConstant): Truthness {

        let results: [string, ApproximatedInterval][] = Object.keys(query.result).map((hash) => {
            let result = query.result[hash];
            let ai = query.approximator.approximate(
                result.value,
                query.progress.processedPercent(),
                query.progress.processedRows,
                query.progress.totalRows
            );

            return [hash, ai] as [string, ApproximatedInterval];
        })

        results.sort((a, b) => a[1].center - b[1].center);
        let rank = results.findIndex(d => d[0] === variable.hash);

        rank += 1; // 1 ~ N

        if (rank <= 0) return false;

        if (operator == Operators.GreaterThan) return rank > constant.rank;
        else if (operator == Operators.GreaterThanOrEqualTo) return rank >= constant.rank;
        else if (operator == Operators.LessThan) return rank < constant.rank;
        else if (operator == Operators.LessThanOrEqualTo) return rank <= constant.rank;
        else throw new Error(`Invalid operator ${operator}`);
    }
}

export class RangeValueEstimator implements EstimatorTrait {
    estimate(query: AggregateQuery, variable: Variable,
        operator: Operators, constant: RangeValueConstant): PValue {
        let result = query.result[variable.fieldGroupedValue.hash].value;
        let ai = query.approximator.approximate(
            result,
            query.progress.processedPercent(),
            query.progress.processedRows,
            query.progress.totalRows);

        let zLeft = (constant.from - ai.center) / ai.stdev;
        let zRight = (constant.to - ai.center) / ai.stdev;

        let cp = normal.cdf(zRight) - normal.cdf(zLeft);

        if (operator == Operators.InRange) return cp;
        else if (operator == Operators.NotInRange) return 1 - cp;
        else throw new Error(`Invalid operator ${operator}`);
    }
}

export class RangeRankEstimator implements EstimatorTrait {
    estimate(query: AggregateQuery, variable: Variable,
        operator: Operators, constant: RangeRankConstant): Truthness {

        let results: [string, ApproximatedInterval][] = Object.keys(query.result).map((hash) => {
            let result = query.result[hash];
            let ai = query.approximator.approximate(
                result.value,
                query.progress.processedPercent(),
                query.progress.processedRows,
                query.progress.totalRows
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
    estimate(query: AggregateQuery, variable: VariablePair,
        operator: Operators): PValue {
        const n = query.progress.processedRows;
        const N = query.progress.totalRows;

        let result1 = query.result[variable.fieldGroupedValue1.hash].value;
        let result2 = query.result[variable.fieldGroupedValue2.hash].value;

        let ai1 = query.approximator.approximate(
            result1,
            query.progress.processedPercent(),
            n,
            N);

        let ai2 = query.approximator.approximate(
            result2,
            query.progress.processedPercent(),
            n,
            N);

        const s_star_sqaured = ai1.stdev * ai1.stdev / ai1.n + ai2.stdev * ai2.stdev / ai2.n;
        // TODO n == N
        const s_star = Math.sqrt(1 - n / N) * Math.sqrt(s_star_sqaured);

        const diff = ai1.center - ai2.center;

        let z = diff / s_star;
        let cp = normal.cdf(z);

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
        let data = query.resultData();
        let n = 0;

        data.forEach(datum => {
            n += datum.ci3.center;
        });

        let diff = 0;
        data.forEach((datum, i) => {
            let p_true = datum.ci3.center / n;
            let p_estimate = constant.compute(i + 1);

            if(diff < Math.abs(p_true - p_estimate))
                diff = Math.abs(p_true - p_estimate);
        })

        return diff;
    }
}

export class NormalEstimator implements EstimatorTrait {
    /**
     *
     * @param query query must use the count aggregate function
     * @param variable must be a single variable (e.g., we do not support
     * (MEAN(Y) by X) ~ N(mu, sigma))
     * @param constant
     */
    estimate(query: AggregateQuery, constant: NormalConstant): Quality {
        let data = query.resultData();
        let n = 0;

        data.forEach(datum => {
            n += datum.ci3.center;
        });

        let diff = 0;
        data.forEach((datum, i) => {
            let p_true = datum.ci3.center / n;
            let range = datum.keys.list[0].value();
            if(isNull(range)) return; // means a count for an empty value

            let [left, right] = range as [number, number];

            let p_estimate = constant.compute(left, right);

            if(diff < Math.abs(p_true - p_estimate))
                diff = Math.abs(p_true - p_estimate);
        })

        return diff;
    }
}

export class LinearRegressionEstimator {
    estimate(query: AggregateQuery, constant: LinearRegressionConstant): Error {

        let data = query.resultData();
        let n = 0;
        let error = 0;

        data.forEach(datum => {
            let range1 = datum.keys.list[0].value();
            let range2 = datum.keys.list[1].value();

            if(isNull(range1) || isNull(range2)) return;

            range1 = range1 as [number, number];
            range2 = range2 as [number, number];

            let x = (range1[0] + range1[1]) / 2;
            let y = (range2[0] + range2[1]) / 2;

            let y_estimate = constant.compute(x);

            n += datum.ci3.center;
            error += (y - y_estimate) * (y - y_estimate) * datum.ci3.center;
        })

        return error / n;
    }
}
