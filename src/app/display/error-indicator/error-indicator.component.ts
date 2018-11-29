import { Component, OnInit, Input } from '@angular/core';
import { Error } from '../../safeguard/validity';

@Component({
    selector: 'error-indicator',
    templateUrl: './error-indicator.component.html',
    styleUrls: ['./error-indicator.component.css']
})
export class ErrorIndicatorComponent implements OnInit {

    constructor() { }

    @Input('e') e: Error;

    ngOnInit() {
    }
}
