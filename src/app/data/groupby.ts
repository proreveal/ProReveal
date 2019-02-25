import { FieldTrait } from './field';
import { FieldGroupedValue } from './field-grouped-value';
import { FieldGroupedValueList } from './field-grouped-value-list';

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
