import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ApproximatorTrait, SumApproximator, MeanApproximator, MaxApproximator, MinApproximator, Approximator } from '../data/approx';
import { AggregateQuery } from '../data/query';
import { Constants } from '../constants';

@Component({
    selector: 'query-indicator',
    templateUrl: './query-indicator.component.html',
    styleUrls: ['./query-indicator.component.scss']
})
export class QueryIndicatorComponent implements OnInit {
    approximators: ApproximatorTrait[] = [
        new SumApproximator(),
        new MeanApproximator(),
        new MaxApproximator(),
        new MinApproximator()
    ];

    L = Constants.locale;

    @Input('query') query: AggregateQuery;
    @Input('editable') editable: boolean;

    @Output('approximatorChanged') approximatorChanged: EventEmitter<string>
        = new EventEmitter();

    constructor() { }

    ngOnInit() {
    }

    thisApproximatorChanged(name: string) {
        if(this.query.approximator.name == name)  return;
        this.query.approximator = Approximator.FromName(name);
        this.approximatorChanged.emit(name);
    }
}
