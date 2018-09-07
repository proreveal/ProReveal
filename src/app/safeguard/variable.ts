import { FieldGroupedValueList, FieldGroupedValue } from "../data/field";

export enum VariableTypes {
    Value,
    Rank
}

export abstract class VariableTrait {

}

export class SingleVariable extends VariableTrait {
    rank = false;

    constructor(public fieldGroupedValue: FieldGroupedValue) {
        super();
    }

    fieldString() {
        return this.fieldGroupedValue.field.name;
    }

    valueString() {
        return this.fieldGroupedValue.valueString();
    }
}

export class DoubleValueVariable extends VariableTrait{ // a < b
    constructor(public variable1: SingleVariable,
                public variable2: SingleVariable) {
        super();
    }

    fieldString1() {
        return this.variable1.fieldString();
    }

    valueString1() {
        return this.variable1.valueString();
    }

    fieldString2() {
        return this.variable2.fieldString();
    }

    valueString2() {
        return this.variable2.valueString();
    }
}

export class DistributionVariable extends VariableTrait {

}

export class GroupValueVariable { // g(*) > 3%

}

export class GroupRankVariable {

}

export class LinearFittingVariable {

}
