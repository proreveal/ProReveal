import { Component, OnInit, Input } from '@angular/core';
import { Error } from '../../safeguard/validity';
import { Constants } from '../../constants';

@Component({
    selector: 'error-indicator',
    templateUrl: './error-indicator.component.html'
})
export class ErrorIndicatorComponent implements OnInit {
    @Input('e') e: Error;
    L = Constants.locale;

    constructor() { }

    ngOnInit() {
    }
}
