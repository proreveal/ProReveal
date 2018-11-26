import { Component, OnInit, Input } from '@angular/core';
import { Truthiness } from '../../safeguard/validity';

@Component({
    selector: 'truthiness-indicator',
    templateUrl: './truthiness-indicator.component.html'
})
export class TruthinessIndicatorComponent implements OnInit {
    @Input() t: Truthiness;

    constructor() { }

    ngOnInit() {
    }

}
