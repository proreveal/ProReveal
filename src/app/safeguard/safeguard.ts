import { Operators } from "./operator";
import { ConstantTrait, PointValueConstant, PointRankConstant, RangeValueConstant } from "./constant";
import { ExplorationNode } from "../exploration/exploration-node";
import { VariableTrait, Variable, VariablePair, DistributiveVariable } from "./variable";
import { NormalDistribution } from "./normal";
import { PointValueEstimator, PointRankEstimator, RangeValueEstimator, ComparativeEstimator } from "./estimate";
import { AggregateQuery } from "../data/query";

const PointValueEstimate = new PointValueEstimator().estimate;
const PointRankEstimate = new PointRankEstimator().estimate;
const RangeValueEstimate = new RangeValueEstimator().estimate;
const ComparativeEstimate = new ComparativeEstimator().estimate;

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

    constructor(
        public type: SafeguardTypes,
        public variable: VariableTrait,
        public operator: Operators,
        public constant: ConstantTrait,
        public node: ExplorationNode
    ) {
        this.createdAt = new Date();
    }
}

export class PointSafeguard extends Safeguard {
    constructor(public variable: Variable,
        public operator: Operators,
        public constant: ConstantTrait,
        public node: ExplorationNode) {
        super(SafeguardTypes.Point, variable, operator, constant, node);
    }

    p() {
        if (this.variable.isRank)
            throw new Error('Cannot estimate the p value for rank');

        return PointValueEstimate(
            this.node.query as AggregateQuery,
            this.variable,
            this.operator,
            this.constant as PointValueConstant);
    }

    t() {
        if (!this.variable.isRank)
            throw new Error('Variable is not a rank. Use p() instead');

        return PointRankEstimate(
            this.node.query as AggregateQuery,
            this.variable,
            this.operator,
            this.constant as PointRankConstant);
    }
}

export class RangeSafeguard extends Safeguard {
    constructor(public variable: Variable,
        public constant: ConstantTrait,
        public node: ExplorationNode) {
        super(SafeguardTypes.Range, variable, Operators.InRange, constant, node);
    }

    p() {
        if (this.variable.isRank)
            throw new Error('Cannot estimate the p value for rank');

        return RangeValueEstimate(
            this.node.query as AggregateQuery,
            this.variable,
            this.operator,
            this.constant as RangeValueConstant);
    }
}

export class ComparativeSafeguard extends Safeguard {
    constructor(public variable: VariablePair,
        public operator: Operators,
        public node: ExplorationNode) {
        super(SafeguardTypes.Comparative, variable, operator, null, node);
    }

    p() {
        if (this.variable.isRank)
            throw new Error('Cannot estimate the p value for rank');

        return ComparativeEstimate(
            this.node.query as AggregateQuery,
            this.variable,
            this.operator);
    }
}

export class DistributiveSafeguard extends Safeguard {
    constructor(public constant: ConstantTrait,
        public node: ExplorationNode) {
        super(SafeguardTypes.Distributive,
            new DistributiveVariable(),
            Operators.Follow,
            constant, node);
    }
}
