import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Constants } from '../constants';
import { toNumber } from '../util';

@Component({
  selector: 'sg-range',
  templateUrl: './sg-range.component.html',
  styleUrls: ['./sg-style.scss']
})
export class SgRangeComponent implements OnInit {
    @Input('variable') variable;
    @Input('isRank') isRank;
    @Input('highlighted') highlighted;
    @Input('query') query;
    @Input('operator') operator;
    @Input('constant') constant;
    @Input('editable') editable = false;

    @Output('highlight') highlight = new EventEmitter<number>();
    @Output('constantUserChanged') constantUserChanged = new EventEmitter<ConstantTrait>();


    CT = Constants;
    toNumber = toNumber;

    editing1 = false;
    editing2 = false;

    constructor() { }

    ngOnInit() {
    }

}
