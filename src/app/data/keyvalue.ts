import { AccumulatedValue, PartialValue } from "./accum";
import { FieldGroupedValueList } from "./field-grouped-value-list";

/**
 * a single row of response (keys & value)
 */
export interface PartialKeyValue {
    key: FieldGroupedValueList;
    value: PartialValue;
}

/**
 * a single row of response (keys & value)
 */
export interface AccumulatedKeyValue {
    key: FieldGroupedValueList;
    value: AccumulatedValue;
}

/**
 * a set of rows (hash => (keys & value))
 */
export type AccumulatedKeyValues = { [hash: string]: AccumulatedKeyValue };
