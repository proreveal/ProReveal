import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Constants } from '../constants';
import { ConstantTrait } from '../safeguard/constant';
import { toNumber } from '../util';

@Component({
  selector: 'sg-point',
  templateUrl: './sg-point.component.html',
  styleUrls: ['./sg-style.scss']
})
export class PointComponent implements OnInit {

    @Input('variable') variable;
    @Input('useRank') useRank;
    @Input('highlighted') highlighted;
    @Input('query') query;
    @Input('operator') operator;
    @Input('constant') constant;

    @Output('highlight') highlight = new EventEmitter<number>();
    @Output('constantUserChanged') constantUserChanged = new EventEmitter<ConstantTrait>();

    CT = Constants;
    toNumber = toNumber;

    editing = false;

    constructor() { }

    ngOnInit() {
    }

}
