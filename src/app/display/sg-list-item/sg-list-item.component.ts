import { Component, OnInit, Input } from '@angular/core';
import { Safeguard, SafeguardTypes } from '../../safeguard/safeguard';

@Component({
    selector: 'sg-list-item',
    templateUrl: './sg-list-item.component.html',
    styleUrls: ['./sg-list-item.component.scss']
})
export class SgListItemComponent implements OnInit {

    @Input('safeguard') sg: Safeguard;
    SGT = SafeguardTypes;

    constructor() { }

    ngOnInit() {
    }
}
