import { FieldTrait, VlType, FieldGroupedValueList, FieldGroupedValue } from './field';
import { assertIn } from './assert';

/**
 * Represents a list of grouping columns.
 * The columns can be quantitative. In such cases, they are binned.
 * The order matters.
 */
export class GroupBy {
    constructor(public fields: FieldTrait[]) {

    }

    group(row: {[key: string]: any}) {
        return new FieldGroupedValueList(
            this.fields.map(field =>
                new FieldGroupedValue(field, field.group(row[field.name]))
        ));
    }
}
