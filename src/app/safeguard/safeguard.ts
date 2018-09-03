import { Query } from "../data/query";
import { Operators } from "./operator";
import { ConstantTrait } from "./constant";
import { ExplorationNode } from "../exploration/exploration-node";
import { VariableTrait } from "./variable";

export class Safeguard {
    constructor(
        public variable: VariableTrait,
        public operator: Operators,
        public constant: ConstantTrait,
        public node: ExplorationNode
    ) {

    }
}
