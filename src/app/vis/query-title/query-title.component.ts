import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ApproximatorTrait, SumApproximator, MeanApproximator, MaxApproximator, MinApproximator } from '../../data/approx';

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

    @Input('query') query;
    @Output('approximatorChanged') approximatorChanged: EventEmitter<string>
        = new EventEmitter();

    constructor() { }

    ngOnInit() {
    }

}
