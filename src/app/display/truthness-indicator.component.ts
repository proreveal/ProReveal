import { Component, OnInit, Input } from '@angular/core';

@Component({
    selector: 'truthness-indicator',
    templateUrl: './truthness-indicator.component.html'
})
export class TruthinessIndicatorComponent implements OnInit {
    @Input() t: boolean;

    constructor() { }

    ngOnInit() {
    }

}
