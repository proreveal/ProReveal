import { Component, OnInit, Input } from '@angular/core';
import { Predicate, EqualPredicate, RangePredicate } from '../../data/predicate';

@Component({
    selector: 'predicate-indicator',
    templateUrl: './predicate-indicator.component.html',
    styleUrls: ['./predicate-indicator.component.css']
})
export class PredicateIndicatorComponent implements OnInit {
    @Input('predicate') predicate: Predicate;

    isEqualPredicate(p: Predicate) { return p instanceof EqualPredicate; }
    isRangePredicate(p: Predicate) { return p instanceof RangePredicate; }

    constructor() { }

    ngOnInit() {
    }

}
