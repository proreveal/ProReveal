import { Component, OnInit, Input, Output, EventEmitter, Query } from '@angular/core';
import { Constants } from '../../constants';
import { LinearConstant, ConstantTrait, ConstantTypes } from '../../safeguard/constant';
import { GroupBy } from '../../data/groupby';
import { FieldTrait, VlType } from '../../data/field';
import { SafeguardTypes } from '../../safeguard/safeguard';

@Component({
  selector: 'sg-distributive',
  templateUrl: './sg-distributive.component.html',
  styleUrls: ['../sg-style.scss']
})
export class SgDistributiveComponent implements OnInit {
    @Input('highlighted') highlighted;
    @Input('query') query: Query;
    @Input('constant') constant: ConstantTrait;
    @Input('groupBy') groupBy: GroupBy;

    LinearConstant = LinearConstant;
    CST = ConstantTypes;
    CT = Constants;

    @Output('highlight') highlight = new EventEmitter<number>();

    isQuantitative(field: FieldTrait) { return field.vlType === VlType.Quantitative; }

    constructor() { }

    ngOnInit() {
    }

}
