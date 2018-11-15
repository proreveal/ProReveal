import { Component, OnInit, Input } from '@angular/core';
import { Truthness } from '../../safeguard/estimate';

@Component({
    selector: 'truthness-indicator',
    templateUrl: './truthness-indicator.component.html'
})
export class TruthnessIndicatorComponent implements OnInit {
    @Input() t: Truthness;

    constructor() { }

    ngOnInit() {
    }

}
