import { Component, OnInit, Input } from '@angular/core';
import { AggregateQuery } from '../data/query';
import { FieldTrait, QuantitativeField } from '../data/field';
import { Constants } from '../constants';

@Component({
    selector: 'variable-indicator',
    templateUrl: './variable-indicator.component.html',
    styleUrls: ['./variable-indicator.component.scss']
})
export class VariableIndicatorComponent implements OnInit {
    @Input('variable') variable;
    @Input('className') className;
    @Input('isRank') isRank: boolean;
    @Input('highlighted') highlighted:boolean;
    @Input('query') query: AggregateQuery;

    L = Constants.locale;

    constructor() { }

    isQuantitative(field: FieldTrait) { return field instanceof QuantitativeField; }

    ngOnInit() {
    }

}
