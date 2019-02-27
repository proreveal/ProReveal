import { FieldGroupedValue } from "../data/field-grouped-value";
import { HashSeparator } from "../data/field-grouped-value-list";

export abstract class VariableTrait {
    isRank;

    get hash(): string {
        throw new Error('Hash must be implemented for a variable');
    }

    toLog() { };
}

export class SingleVariable extends VariableTrait {
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

    toLog() {
        return this.fieldGroupedValue.toLog();
    }
}

export class VariablePair extends VariableTrait { // (a = 1) < (a = 2)
    isRank = false;
    isCombined = false;

    static FromVariables(first: SingleVariable, second: SingleVariable) {
        return new VariablePair(first, second);
    }

    constructor(public first: SingleVariable, public second: SingleVariable) {
        super();
    }

    fieldString1() {
        return this.first.fieldGroupedValue.field.name;
    }

    valueString1() {
        return this.first.fieldGroupedValue.field.name;
    }

    fieldString2() {
        return this.first.fieldGroupedValue.valueString();
    }

    valueString2() {
        return this.first.fieldGroupedValue.valueString();
    }

    get hash() {
        return `${this.first.fieldGroupedValue.hash}${HashSeparator}${this.second.fieldGroupedValue.hash}`;
    }

    toLog() {
        return ['pair', this.first.toLog(), this.second.toLog()];
    }
}

export class CombinedVariable extends VariableTrait { // (a = 1, b = 2)
    isRank = false;
    isCombined = true;

    static FromVariables(first: SingleVariable, second: SingleVariable) {
        return new CombinedVariable(first, second);
    }

    constructor(public first:SingleVariable, public second: SingleVariable) {
        super();
    }

    fieldString1() {
        return this.first.fieldGroupedValue.field.name;
    }

    fieldString2() {
        return this.second.fieldGroupedValue.field.name;
    }

    valueString1() {
        return this.first.fieldGroupedValue.valueString();
    }

    valueString2() {
        return this.second.fieldGroupedValue.valueString();
    }

    get hash() {
        return `${this.first.fieldGroupedValue.hash}${HashSeparator}${this.second.fieldGroupedValue.hash}`;
    }

    toLog() {
        return ['combined', this.first.toLog(), this.second.toLog()];
    }
}

export class CombinedVariablePair extends VariableTrait { // (a = 1, b = 2) (a = 2, b = 3)
    isRank = false;
    isCombined = true;

    static FromVariables(first: CombinedVariable, second: CombinedVariable) {
        return new CombinedVariablePair(first, second);
    }

    constructor(public first:CombinedVariable, public second: CombinedVariable) {
        super();
    }

    get hash() {
        return `${this.first.hash}${HashSeparator}${this.second.hash}`;
    }

    toLog() {
        return ['combined pair', this.first.toLog(), this.second.toLog()];
    }
}

export class DistributiveVariable extends VariableTrait {
    toLog() { return 'distributive variable'; }
}
