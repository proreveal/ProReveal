import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Constants } from '../../constants';

@Component({
    selector: 'sg-comparative',
    templateUrl: './sg-comparative.component.html',
    styleUrls: ['../sg-style.scss']
})
export class SgComparativeComponent implements OnInit {

    @Input('variable1') variable1;
    @Input('variable2') variable2;
    @Input('highlighted') highlighted;
    @Input('query') query;
    @Input('operator') operator;

    CT = Constants;

    @Output('highlight') highlight = new EventEmitter<number>();


    constructor() { }

    ngOnInit() {
    }

}
