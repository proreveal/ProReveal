import { Query } from "../data/query";
import { Operators } from "./operator";
import { Value } from "./value";
import { ExplorationNode } from "../exploration/exploration-node";
import { VariableTrait } from "./variable";

export class Safeguard {
    constructor(
        public variable: VariableTrait,
        public operator: Operators,
        public value: Value,
        public node: ExplorationNode
    ) {

    }
}
