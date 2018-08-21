import { FieldGroupedValueList } from "../data/field";

export abstract class VariableTrait {

}

export class SingleValueVariable extends VariableTrait {
    constructor(public fieldGroupedValueList: FieldGroupedValueList) {
        super();
    }

    fieldString() {
        return this.fieldGroupedValueList.list[0].field.name;
    }

    valueString() {
        return this.fieldGroupedValueList.list[0].valueString();
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
