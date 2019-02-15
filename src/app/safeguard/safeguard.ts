import { Operators } from "./operator";
import { ConstantTrait, PointValueConstant, PointRankConstant, RangeValueConstant, NormalConstant, PowerLawConstant, LinearRegressionConstant } from "./constant";
import { VariableTrait, VariablePair, DistributiveVariable, CombinedVariablePair } from "./variable";
import { NormalDistribution } from "./normal";
import {
    PointValueEstimator, PointRankEstimator, RangeValueEstimator, ComparativeEstimator,
    NormalEstimator, PowerLawEstimator, LinearRegressionEstimator, PointMinMaxValueEstimator, PointMinMaxRankValueEstimator
} from "./estimate";
import { ValidityTypes, Validity } from "./validity";
import { AggregateQuery } from "../data/query";

const PointValueEstimate = new PointValueEstimator().estimate;
const PointRankEstimate = new PointRankEstimator().estimate;
const RangeValueEstimate = new RangeValueEstimator().estimate;
const ComparativeEstimate = new ComparativeEstimator().estimate;
const PowerLawEstimate = new PowerLawEstimator().estimate;
const NormalEstimate = new NormalEstimator().estimate;
const LinearRegressionEstimate = new LinearRegressionEstimator().estimate;
const PointMinMaxValueEstimate = new PointMinMaxValueEstimator().estimate
const PointMinMaxRankEstimate = new PointMinMaxRankValueEstimator().estimate;

export enum SafeguardTypes {
    None = "None",
    Point = "Point",
    Range = "Range",
    Comparative = "Comparative",
    Distributive = "Distributive"
}

export class Safeguard {
    static normal = new NormalDistribution();
    createdAt: Date;
    validityType: ValidityTypes;
    history: Validity[] = [];
    lastUpdated: number;
    lastUpdatedAt: Date;

    constructor(
        public type: SafeguardTypes,
        public variable: VariableTrait,
        public operator: Operators,
        public constant: ConstantTrait,
        public query: AggregateQuery
    ) {
        this.createdAt = new Date();
        this.lastUpdatedAt = new Date();
        this.lastUpdated = +new Date();
    }

    validity(): Validity {
        throw new Error('validity() must be implemented');
    }
}

export class PointSafeguard extends Safeguard {
    readonly validityType = ValidityTypes.PValue;

    constructor(public variable: VariableTrait,
        public operator: Operators,
        public constant: ConstantTrait,
        public query: AggregateQuery) {
        super(SafeguardTypes.Point, variable, operator, constant, query);
    }

    p() {
        if (this.variable.isRank)
            return PointRankEstimate(
                this.query,
                this.variable,
                this.operator,
                this.constant as PointRankConstant);


        return PointValueEstimate(
            this.query,
            this.variable,
            this.operator,
            this.constant as PointValueConstant);
    }

    t() {  // min or max
        if (this.variable.isRank)
            return PointMinMaxRankEstimate(
                this.query,
                this.variable,
                this.operator,
                this.constant as PointRankConstant);

        return PointMinMaxValueEstimate(
            this.query,
            this.variable,
            this.operator,
            this.constant as PointValueConstant);
    }

    validity() {
        if (this.query.approximator.estimatable) return this.p();
        return this.t();
    }
}

export class RangeSafeguard extends Safeguard {
    readonly validityType = ValidityTypes.PValue;

    constructor(public variable: VariableTrait,
        public constant: ConstantTrait,
        public query: AggregateQuery) {
        super(SafeguardTypes.Range, variable, Operators.InRange, constant, query);
    }

    p() {
        if (this.variable.isRank)
            throw new Error('Cannot estimate the p value for rank');

        return RangeValueEstimate(
            this.query,
            this.variable,
            this.operator,
            this.constant as RangeValueConstant);
    }

    validity() {
        return this.p();
    }
}

export class ComparativeSafeguard extends Safeguard {
    readonly validityType = ValidityTypes.PValue;

    constructor(public variable: VariablePair | CombinedVariablePair,
        public operator: Operators,
        public query: AggregateQuery) {
        super(SafeguardTypes.Comparative, variable, operator, null, query);
    }

    p() {
        if (this.variable.isRank)
            throw new Error('Cannot estimate the p value for rank');

        return ComparativeEstimate(
            this.query,
            this.variable,
            this.operator);
    }

    validity() {
        return this.p();
    }
}

export class DistributiveSafeguard extends Safeguard {
    get validityType() {
        if (this.constant instanceof LinearRegressionConstant) return ValidityTypes.Error;
        return ValidityTypes.Quality
    };

    constructor(public constant: ConstantTrait,
        public query: AggregateQuery) {
        super(SafeguardTypes.Distributive,
            new DistributiveVariable(),
            Operators.Follow,
            constant, query);
    }

    q() {
        if (this.constant instanceof NormalConstant) {
            return NormalEstimate(
                this.query,
                this.constant as NormalConstant);
        }

        return PowerLawEstimate(
            this.query,
            this.constant as PowerLawConstant
        );
    }

    e() {
        return LinearRegressionEstimate(
            this.query,
            this.constant as LinearRegressionConstant
        )
    }

    validity() {
        if (this.constant instanceof LinearRegressionConstant) return this.e();
        return this.q();
    }

    updateConstant() {
        if (this.constant instanceof NormalConstant) {
            this.constant = NormalConstant.FitFromVisData(this.query.getRecentData());
        }
        else if (this.constant instanceof PowerLawConstant) {
            this.constant = PowerLawConstant.FitFromVisData(this.query.getRecentData());
        }
        else if (this.constant instanceof LinearRegressionConstant) {
            this.constant = LinearRegressionConstant.FitFromVisData(this.query.getRecentData());
        }
        else {
            throw new Error(`Unknown constant type: ${this.constant}`);
        }
    }
}
