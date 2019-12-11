import { Component, OnInit, Input } from '@angular/core';
import { Boolean } from '../../safeguard/validity';
import { Constants } from '../../constants';

@Component({
    selector: 'boolean-indicator',
    templateUrl: './boolean-indicator.component.html'
})
export class BooleanIndicatorComponent implements OnInit {
    @Input() t: Boolean;

    L = Constants.locale;

    constructor() { }

    ngOnInit() {
    }

}
