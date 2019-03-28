import { Component, OnInit, Input, Output, EventEmitter, Query } from '@angular/core';
import { Constants } from '../../constants';
import { LinearRegressionConstant } from '../../safeguard/constant';
import { CombinedVariablePair } from '../../safeguard/variable';
import { GroupBy } from '../../data/groupby';
import { FieldTrait, VlType } from '../../data/field';

@Component({
  selector: 'sg-distributive',
  templateUrl: './sg-distributive.component.html',
  styleUrls: ['../sg-style.scss']
})
export class SgDistributiveComponent implements OnInit {
    @Input('highlighted') highlighted;
    @Input('query') query: Query;
    @Input('constant') constant;
    @Input('groupBy') groupBy: GroupBy;

    LinearRegressionConstant = LinearRegressionConstant;
    CT = Constants;

    @Output('highlight') highlight = new EventEmitter<number>();

    isQuantitative(field: FieldTrait) { return field.vlType === VlType.Quantitative; }

    constructor() { }

    ngOnInit() {
    }

}
