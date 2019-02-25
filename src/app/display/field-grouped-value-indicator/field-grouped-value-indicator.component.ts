import { Component, OnInit, Input } from '@angular/core';
import { FieldTrait, QuantitativeField } from '../../data/field';
import { FieldGroupedValue } from '../../data/field-grouped-value';

@Component({
    selector: 'field-grouped-value-indicator',
    templateUrl: './field-grouped-value-indicator.component.html'
})
export class FieldGroupedValueIndicatorComponent implements OnInit {
    isQuantitative(field: FieldTrait) { return field instanceof QuantitativeField;}

    @Input('fieldGroupedValue') fieldGroupedValue: FieldGroupedValue;
    @Input('showName') showName = false;

    constructor() { }

    ngOnInit() {
    }

}
