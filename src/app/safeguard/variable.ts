import { FieldGroupedValueList, FieldGroupedValue, HashSeparator } from "../data/field";

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

export class DoubleVariable extends VariableTrait { // a < b
    constructor(public first: SingleVariable,
        public second: SingleVariable) {
        super();
    }

    /*fieldString1() {
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
    }*/
}

export class SingleCombinedVariable extends VariableTrait { // (a=1, b=2)
    rank = false;
    combined = true;

    constructor(public fieldGroupedValue1: FieldGroupedValue, public fieldGroupedValue2: FieldGroupedValue) {
        super();
    }

    fieldString1() {
        return this.fieldGroupedValue1.field.name;
    }

    valueString1() {
        return this.fieldGroupedValue2.field.name;
    }

    fieldString2() {
        return this.fieldGroupedValue1.valueString();
    }

    valueString2() {
        return this.fieldGroupedValue2.valueString();
    }

    get hash() {
        return `${this.fieldGroupedValue1.hash}${HashSeparator}${this.fieldGroupedValue2.hash}`;
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
