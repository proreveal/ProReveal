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

export class DoubleValueVariable { // a < b

}

export class GroupValueVariable { // g(*) > 3%

}

export class GroupRankVariable {

}

export class DistributionVariable {

}

export class LinearFittingVariable {

}
