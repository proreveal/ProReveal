import * as d3 from 'd3-array';
import { isUndefined, isNull } from 'util';

export type GroupIdType = number;
export const NullGroupId = Number.MAX_SAFE_INTEGER;
export const NullString = '(empty)';

/**
 * maps a string value to a number
 */
export class CategoricalGrouper {
    size = 0;
    dict = {};
    inverse = { NullGroupId: null };

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

    ungroup(id: GroupIdType): any {
        return this.inverse[id];
    }

    ungroupString(id: GroupIdType): string {
        if(id === NullGroupId) return NullString;
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

    group(value: number | null) {
        if (isNull(value)) return NullGroupId;

        if (this.max < value) this.max = value;
        if (this.min > value) this.min = value;

        if (this.max === value) return Math.floor((value - this.base) / this.step) - 1;
        return Math.floor((value - this.base) / this.step);
    }

    ungroup(id: GroupIdType) {
        if (id === NullGroupId) return null;

        return [this.base + this.step * id, this.base + this.step * (id + 1)];
    }

    ungroupString(id: GroupIdType): string {
        if(id === NullGroupId) return NullString;
        return this.ungroup(id).toString();
    }
}
