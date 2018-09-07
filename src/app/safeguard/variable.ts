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

export class DoubleVariable extends VariableTrait{ // a < b
    constructor(public first: SingleVariable,
                public second: SingleVariable) {
        super();
    }

    fieldString1() {
        return this.first.fieldString();
    }

    valueString1() {
        return this.first.valueString();
    }

    fieldString2() {
        return this.second.fieldString();
    }

    valueString2() {
        return this.second.valueString();
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
