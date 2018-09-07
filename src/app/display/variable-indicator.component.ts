import { Component, OnInit, Input } from '@angular/core';
import { AggregateQuery } from '../data/query';

@Component({
    selector: 'variable-indicator',
    templateUrl: './variable-indicator.component.html',
    styleUrls: ['./variable-indicator.component.scss']
})
export class VariableIndicatorComponent implements OnInit {
    @Input('variable') variable;
    @Input('className') className;
    @Input('useRank') useRank: boolean;
    @Input('highlighted') highlighted:boolean;
    @Input('query') query: AggregateQuery;

    constructor() { }

    ngOnInit() {
    }

}
