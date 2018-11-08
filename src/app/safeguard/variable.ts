import { FieldGroupedValueList, FieldGroupedValue, HashSeparator } from "../data/field";

export enum VariableTypes {
    Value,
    Rank
}

export abstract class VariableTrait {

}

export class Variable extends VariableTrait {
    isRank = false;

    constructor(public fieldGroupedValue: FieldGroupedValue) {
        super();
    }

    fieldString() {
        return this.fieldGroupedValue.field.name;
    }

    valueString() {
        return this.fieldGroupedValue.valueString();
    }

    get hash() {
        return this.fieldGroupedValue.hash;
    }
}

export class VariablePair extends VariableTrait { // (a=1, b=2)
    isRank = false;
    isCombined = true;

    static FromVariables(first: Variable, second: Variable) {
        return new VariablePair(first.fieldGroupedValue, second.fieldGroupedValue);
    }

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

export class DistributiveVariable extends VariableTrait {

}

export class LinearRegressionVariable extends VariableTrait {

}

export class GroupValueVariable extends VariableTrait { // g(*) > 3%

}

