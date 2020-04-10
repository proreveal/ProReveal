import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { Safeguard, SafeguardTypes } from '../../safeguard/safeguard';
import { Constants } from '../../constants';

let id = 0;

@Component({
    selector: 'sg-list-item',
    templateUrl: './sg-list-item.component.html',
    styleUrls: ['./sg-list-item.component.scss']
})
export class SgListItemComponent implements OnInit {
    SGT = SafeguardTypes;
    L = Constants.locale;

    @Input('safeguard') sg: Safeguard;
    @Output('removeClicked') removeClicked:EventEmitter<Safeguard> = new EventEmitter();

    alarmOpen = true;
    id = '';

    constructor() {
        this.id = (id++).toString();
    }

    ngOnInit() {
    }

    toggleAlarm() {
        this.alarmOpen = !this.alarmOpen;
    }

    ceil(v:number) {
        return Math.ceil(v);
    }
}
