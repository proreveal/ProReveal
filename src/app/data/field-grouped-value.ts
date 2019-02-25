import { FieldTrait, QuantitativeField } from "./field";
import { GroupIdType, NullGroupId } from "./grouper";
import { isString } from "util";

/**
 * field & grouped value id (can be a negative integer)
 */
export class FieldGroupedValue {
    hash: string;

    constructor(public field: FieldTrait, public groupId: GroupIdType) {
        this.hash = `${field.name}:${groupId}`;
    }

    get includeEnd() {
        if(isString(this.value())) return false;

        return this.groupId[1] >= (this.field as QuantitativeField).grouper.lastGroupId;
    }

    get hasNullValue() {
        return this.groupId === NullGroupId;
    }

    value() {
        return this.field.ungroup(this.groupId);
    }

    valueString() {
        return this.field.ungroupString(this.groupId);
    }

    toLog() {
        return {
            field: this.field.name,
            groupId: this.groupId,
            value: this.value()
        };
    }
}

