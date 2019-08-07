import { AggregateValue } from "./accum";
import { FieldGroupedValueList } from "./field-grouped-value-list";

/**
 * a single row of response (keys & value)
 */
export interface AggregateKeyValue {
    key: FieldGroupedValueList;
    value: AggregateValue;
}

/**
 * a set of rows (hash => (keys & value))
 */
export type AggregateKeyValues = { [hash: string]: AggregateKeyValue };
