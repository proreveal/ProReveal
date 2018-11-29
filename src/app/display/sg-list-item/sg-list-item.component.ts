import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { Safeguard, SafeguardTypes } from '../../safeguard/safeguard';

@Component({
    selector: 'sg-list-item',
    templateUrl: './sg-list-item.component.html',
    styleUrls: ['./sg-list-item.component.scss']
})
export class SgListItemComponent implements OnInit {
    SGT = SafeguardTypes;

    @Input('safeguard') sg: Safeguard;
    @Output('removeClicked') removeClicked:EventEmitter<Safeguard> = new EventEmitter();

    constructor() { }

    ngOnInit() {
    }
}
