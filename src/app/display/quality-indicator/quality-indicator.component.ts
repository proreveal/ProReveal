import { Component, OnInit, Input } from '@angular/core';
import { Quality } from '../../safeguard/validity';
import { Constants } from '../../constants';

@Component({
    selector: 'quality-indicator',
    templateUrl: './quality-indicator.component.html'
})
export class QualityIndicatorComponent implements OnInit {
    L = Constants.locale;

    constructor() { }

    @Input('q') q: Quality;

    ngOnInit() {
    }

}
