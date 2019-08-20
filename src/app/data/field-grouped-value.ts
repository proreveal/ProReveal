import { FieldTrait, QuantitativeField } from "./field";
import { GroupIdType, NullGroupId } from "./grouper";
import { isString } from "util";
import { Dataset } from "./dataset";

/**
 * field & grouped value id (can be a negative integer)
 */
export class FieldGroupedValue {
    hash: string;

    constructor(public field: FieldTrait, public groupId: GroupIdType) {
        this.hash = `${field.name}:${groupId}`;
    }

    get includeEnd() {
        if (isString(this.value())) return false;

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

    toJSON() {
        return {
            field: this.field.name,
            groupId: this.groupId,
            value: this.value()
        }
    }

    static fromJSON(json: any, dataset: Dataset) {
        const field = dataset.getFieldByName(json.field);
        let value: FieldGroupedValue;

        if (field instanceof QuantitativeField) {
            value = new FieldGroupedValue(field, json.groupId);
        }
        else {
            value = new FieldGroupedValue(field, field.group(json.value));
        }

        return value;
    }
}

