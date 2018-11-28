import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ApproximatorTrait, SumApproximator, MeanApproximator, MaxApproximator, MinApproximator, Approximator } from '../../data/approx';
import { AggregateQuery } from '../../data/query';

@Component({
    selector: 'query-title',
    templateUrl: './query-title.component.html',
    styleUrls: ['./query-title.component.scss']
})
export class QueryTitleComponent implements OnInit {
    approximators: ApproximatorTrait[] = [
        new SumApproximator(),
        new MeanApproximator(),
        new MaxApproximator(),
        new MinApproximator()
    ];

    @Input('query') query: AggregateQuery;
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
