import { Component, OnInit, Input } from '@angular/core';

@Component({
    selector: 'truthness-indicator',
    templateUrl: './truthness-indicator.component.html'
})
export class TruthnessIndicatorComponent implements OnInit {
    @Input() t: boolean;

    constructor() { }

    ngOnInit() {
    }

}
