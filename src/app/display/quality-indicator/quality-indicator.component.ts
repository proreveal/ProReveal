import { Component, OnInit, Input } from '@angular/core';
import { Quality } from '../../safeguard/validity';

@Component({
    selector: 'quality-indicator',
    templateUrl: './quality-indicator.component.html',
    styleUrls: ['./quality-indicator.component.css']
})
export class QualityIndicatorComponent implements OnInit {

    constructor() { }

    @Input('q') q: Quality;

    ngOnInit() {
    }

}
