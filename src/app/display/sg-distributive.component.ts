import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Constants } from '../constants';

@Component({
  selector: 'sg-distributive',
  templateUrl: './sg-distributive.component.html',
  styleUrls: ['./sg-style.scss']
})
export class SgDistributiveComponent implements OnInit {
    @Input('highlighted') highlighted;
    @Input('query') query;
    @Input('constant') constant;

    CT = Constants;

    @Output('highlight') highlight = new EventEmitter<number>();

    constructor() { }

    ngOnInit() {
    }

}
