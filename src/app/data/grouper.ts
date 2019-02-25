import * as d3 from 'd3-array';
import * as d3format from 'd3-format';

import { isNull, isArray } from 'util';
import { Constants, Languages } from '../constants';
import { QuantitativeUnit } from './unit';

export type GroupIdType = number | [number, number];
export const NullGroupId = Number.MAX_SAFE_INTEGER;
export const NullString = Constants.nullValueString;

/**
 * maps a string value to a number
 */
export class CategoricalGrouper {
    size = 1;
    dict = {};
    inverse: { [id: string]: null | string } = { NullGroupId: null };

    constructor() {

    }

    order(ordering: { any: GroupIdType }) {
        this.dict = ordering;
    }

    group(value: any) {
        if (isNull(value)) return NullGroupId;

        if (!this.dict[value]) {
            this.dict[value] = this.size;
            this.inverse[this.size] = value;

            this.size++;
        }

        return this.dict[value];
    }

    ungroup(id: GroupIdType): null | string {
        if (isArray(id)) throw new Error(`${id} is not a single integer!`);
        return this.inverse[id as any];
    }

    ungroupString(id: GroupIdType): string {
        if (id === NullGroupId) return NullString;
        return this.ungroup(id).toString();
    }
}

/**
 * maps a number to a bin number
 */
export class NumericalGrouper {
    numBins: number;
    step: number;
    min: number;
    max: number;
    base: number;

    constructor(approxMin: number, approxMax: number, approxNumBins = 40) {
        const ticks = d3.ticks(approxMin, approxMax, approxNumBins);

        this.min = ticks[0];
        this.max = ticks[ticks.length - 1];
        this.numBins = ticks.length;
        this.step = this.numBins > 1 ? ticks[1] - ticks[0] : 1;
        this.base = this.min;
    }

    get lastGroupId() {
        return Math.floor((this.max - this.base) / this.step) - 1;
    }

    group(value: number | null) {
        if (isNull(value)) return NullGroupId;

        if (this.max < value) this.max = value;
        if (this.min > value) this.min = value;

        if (this.max === value) return Math.floor((value - this.base) / this.step) - 1;
        return Math.floor((value - this.base) / this.step);
    }

    ungroup(id: GroupIdType): null | [number, number] {
        if (id === NullGroupId) return null;
        if (isArray(id)) return [this.base + this.step * id[0], this.base + this.step * (id[1] + 1)]
        id = <number>id;
        return [this.base + this.step * id, this.base + this.step * (id + 1)];
    }

    ungroupString(id: GroupIdType, format: string, unit: QuantitativeUnit): string {
        if (id === NullGroupId) return NullString;
        let ug = this.ungroup(id);

        if (unit === QuantitativeUnit.USD && Constants.lang === Languages.ko_KR) {
            return `~${Constants.currency(ug[1])}`;
        }

        return `~${d3format.format(format)(ug[1])}`;
    }

    getGroupIds() {
        return d3.range(Math.floor((this.min - this.base) / this.step), Math.floor((this.max - this.base) / this.step))
    }
}
