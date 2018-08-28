import { Query } from "../data/query";
import { Operators } from "./operator";
import { Constant } from "./constant";
import { ExplorationNode } from "../exploration/exploration-node";
import { VariableTrait } from "./variable";

export enum SafeguardTypes {
    None = 0,
    Point = 1,
    Range = 2,
    Comparative = 3,
    Distributive = 4
}

export class Safeguard {
    constructor(
        public variable: VariableTrait,
        public operator: Operators,
        public constant: Constant,
        public node: ExplorationNode
    ) {

    }
}
