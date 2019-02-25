import { Component, OnInit, Input } from '@angular/core';
import { Truthiness } from '../../safeguard/validity';
import { Constants } from '../../constants';

@Component({
    selector: 'truthiness-indicator',
    templateUrl: './truthiness-indicator.component.html'
})
export class TruthinessIndicatorComponent implements OnInit {
    @Input() t: Truthiness;

    L = Constants.locale;

    constructor() { }

    ngOnInit() {
    }

}
