import { FieldGroupedValue } from "./field-grouped-value";

export const HashSeparator = '=';

export class FieldGroupedValueList {
    hash: string;

    constructor(public list: FieldGroupedValue[]) {
        this.hash = list.map(d => d.hash).join(HashSeparator);
    }

    desc() {
        return this.list.map(item => `${item.field.name}: ${item.field.ungroup(item.groupId)}`).join(', ');
    }

    hasNullValue() {
        for(let i = 0; i < this.list.length; i++) {
            if(this.list[i].hasNullValue) return true;
        }
        return false;
    }

    toLog() {
        return this.list.map(d => d.toLog());
    }
}
