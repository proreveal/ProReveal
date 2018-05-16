import { FieldTrait, VlType } from '../dataset';
import { assertIn } from './assert';

/**
 * Represents a list of categorical columns.
 * The order matters.
 */
export class GroupBy {
    constructor(public fields: FieldTrait[]) {
        fields.forEach(field => assertIn(field.vlType,
            [VlType.Dozen, VlType.Nominal, VlType.Ordinal]
        ));
    }
}
