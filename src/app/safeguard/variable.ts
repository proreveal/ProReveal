import { FieldGroupedValueList, FieldGroupedValue } from "../data/field";

export abstract class VariableTrait {

}

export class SingleValueVariable extends VariableTrait {
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

export class SingleRankVariable {

}

export class DoubleValueVariable extends VariableTrait{ // a < b
    constructor(public variable1: SingleValueVariable,
                public variable2: SingleValueVariable) {
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

export class GroupValueVariable { // g(*) > 3%

}

export class GroupRankVariable {

}

export class DistributionVariable {

}

export class LinearFittingVariable {

}
