import { isNull, isNumber, isString } from "util";
import { NumericalGrouper, CategoricalGrouper, GroupIdType, NullGroupId } from './grouper';

export enum DataType {
    String = "String",
    Integer = "Integer",
    Real = "Real"
}

export enum VlType {
    Quantitative = "Quantitative",
    Dozen = "Dozen",
    Ordinal = "Ordinal",
    Nominal = "Nominal",
    Key = "Key"
}

export function getVlType(name: string) {
    switch(name.toLowerCase()) {
        case VlType.Quantitative.toLowerCase(): return VlType.Quantitative;
        case VlType.Dozen.toLowerCase(): return VlType.Dozen;
        case VlType.Ordinal.toLowerCase(): return VlType.Ordinal;
        case VlType.Nominal.toLowerCase(): return VlType.Nominal;
        case VlType.Key.toLowerCase(): return VlType.Key;
    }

    throw new Error(`unknown vltype: ${name}`);
}

export interface FieldTrait {
    name: string;
    dataType: DataType;
    vlType: VlType;
    nullable: boolean;

    group(value: any): number;
    ungroup(id: GroupIdType): null | string | [number, number];
    ungroupString(id: GroupIdType): string;
}

export class QuantitativeField implements FieldTrait {
    vlType: VlType = VlType.Quantitative;
    grouper: NumericalGrouper;

    constructor(public name: string, public dataType: DataType,
        public initialMin: number, public initialMax: number, public numBins: number = 40,
        public nullable: boolean = false) {

        this.grouper = new NumericalGrouper(initialMin, initialMax, numBins);
    }

    group(value: any) {
        return this.grouper.group(value);
    }

    ungroup(id: GroupIdType) {
        return this.grouper.ungroup(id);
    }

    ungroupString(id: GroupIdType, format?: string) {
        return this.grouper.ungroupString(id, format);
    }

    get max() { return this.grouper.max; }
    get min() { return this.grouper.min; }
}

export class CategoricalField implements FieldTrait {
    vlType: VlType = VlType.Dozen;
    private grouper: CategoricalGrouper = new CategoricalGrouper();

    constructor(public name: string, public dataType: DataType,
        public nullable: boolean = false) {
    }

    group(value: any) {
        return this.grouper.group(value);
    }

    ungroup(id: GroupIdType) {
        return this.grouper.ungroup(id);
    }

    ungroupString(id: GroupIdType) {
        return this.grouper.ungroupString(id);
    }
}

export class DozenField extends CategoricalField {
    vlType: VlType = VlType.Dozen;
}

export class OrdinalField extends CategoricalField {
    vlType: VlType = VlType.Ordinal;
}

export class NominalField extends CategoricalField {
    vlType: VlType = VlType.Nominal;
}

export class KeyField extends CategoricalField {
    vlType: VlType = VlType.Key;
}

/**
 * field & raw field value
 */
export class FieldValue {
    hash: string;

    constructor(public field: FieldTrait, public value: any) {
        if (field.nullable && isNull(value)) {
            // it is okay
        }
        else if (field.dataType == DataType.Integer && !Number.isInteger(value)) {
            throw `[field:${field.name}] the value ${value} is not an integer`;
        }
        else if (field.dataType == DataType.Real && !isNumber(value)) {
            throw `[field:${field.name}] the value ${value} is not a number`;
        }
        else if (field.dataType == DataType.String && !isString(value)) {
            throw `[field:${field.name}] the value ${value} is not a string`;
        }

        this.hash = `${field.name}:${value}`;
    }
}

export class FieldValueList {
    hash: string;

    constructor(public list: FieldValue[]) {
        this.hash = list.map(d => d.hash).join('_');
    }
}

/**
 * field & grouped value id (can be a negative integer)
 */
export class FieldGroupedValue {
    hash: string;

    constructor(public field: FieldTrait, public groupId: GroupIdType) {
        this.hash = `${field.name}:${groupId}`;
    }

    value() {
        return this.field.ungroup(this.groupId);
    }

    valueString() {
        return this.field.ungroupString(this.groupId);
    }
}

export const HashSeparator = '_';

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
            if(this.list[i].groupId == NullGroupId) return true;
        }
        return false;
    }
}


export function guess(values: any[]): [DataType, VlType, boolean] {
    let dataType = guessDataType(values);
    let unique = {};
    let n = values.length;

    values.forEach(value => unique[value] = true);

    let cardinality = Object.keys(unique).length;
    let vlType: VlType;

    if (cardinality <= 20) vlType = VlType.Dozen;
    else if (dataType === DataType.Integer || dataType === DataType.Real)
        vlType = VlType.Quantitative;
    else if (cardinality <= 100)
        vlType = VlType.Nominal;
    else
        vlType = VlType.Key;

    return [dataType, vlType, unique[null as any] > 0];
}

export function guessDataType(values: any[]) {
    for (let i = 0; i < values.length; i++) {
        let value = values[i];
        let float = parseFloat(value);

        if (!isNull(value) && isNaN(float)) return DataType.String;
        if (!isNull(value) && !Number.isInteger(float)) return DataType.Real;
    }

    return DataType.Integer;
}
