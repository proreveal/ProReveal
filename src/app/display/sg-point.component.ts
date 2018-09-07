import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Constants } from '../constants';

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

    CT = Constants;

    @Output('highlight') highlight = new EventEmitter<number>();

    constructor() { }

    ngOnInit() {
    }

}
