import { Query } from "../data/query";
import { Operators } from "./operator";
import { ConstantTrait } from "./constant";
import { ExplorationNode } from "../exploration/exploration-node";
import { VariableTrait, SingleVariable } from "./variable";
import { AggregateQuery } from "../data/query";
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
        public variable: VariableTrait,
        public operator: Operators,
        public constant: ConstantTrait,
        public node: ExplorationNode
    ) {

    }

    static EstimatePoint(query: AggregateQuery, variable: SingleVariable,
        operator: Operators, constant: number) {
        let result = query.result[variable.fieldGroupedValue.hash].accumulatedValue;
        let ai = query.accumulator.approximate(
                result,
                query.progress.processedPercent(),
                query.dataset.length);

        let z = (constant - ai.mean) / ai.stdem;
        let cp = Safeguard.normal.cdf(z);

        if(operator == Operators.GreaterThan || operator == Operators.GreaterThanOrEqualTo) {
            return 1 - cp;
        }
        else if(operator == Operators.LessThan || operator == Operators.LessThanOrEqualTo) {
            return cp;
        }
        else {
            throw new Error(`Invalid operator ${operator}`);
        }
    }

    // http://195.134.76.37/applets/AppletTtest/Appl_Ttest2.html
    static CompareMeans(query: AggregateQuery, variable: SingleVariable,
        operator: Operators, variable2: SingleVariable) {
        return 0.5
    }
}
