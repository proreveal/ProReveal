import { Operators } from "./operator";
import { ConstantTrait } from "./constant";
import { ExplorationNode } from "../exploration/exploration-node";
import { VariableTrait, Variable, VariablePair, DistributiveVariable } from "./variable";
import { NormalDistribution } from "./normal";

 export enum SafeguardTypes {
    None = 0,
    Point = 1,
    Range = 2,
    Comparative = 3,
    Distributive = 4
}

export class Safeguard {
    static normal = new NormalDistribution();

    constructor(
        public type: SafeguardTypes,
        public variable: VariableTrait,
        public operator: Operators,
        public constant: ConstantTrait,
        public node: ExplorationNode
    ) {

    }
}

export class PointSafeguard extends Safeguard {
    constructor(public variable: Variable,
        public operator: Operators,
        public constant: ConstantTrait,
        public node: ExplorationNode) {
            super(SafeguardTypes.Point, variable, operator, constant, node);
    }
}

export class RangeSafeguard extends Safeguard {
    constructor(public variable: Variable,
        public constant: ConstantTrait,
        public node: ExplorationNode) {
            super(SafeguardTypes.Range, variable, Operators.InRange, constant, node);
    }
}

export class ComparativeSafeguard extends Safeguard {
    constructor(public variable: VariablePair,
        public operator: Operators,
        public node: ExplorationNode) {
            super(SafeguardTypes.Comparative, variable, operator, null, node);
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
