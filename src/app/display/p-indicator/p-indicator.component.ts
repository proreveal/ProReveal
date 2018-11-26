import { Component, OnInit, Input } from '@angular/core';
import { PValue } from '../../safeguard/validity';

@Component({
  selector: 'p-indicator',
  templateUrl: './p-indicator.component.html'
})
export class PIndicatorComponent implements OnInit {
    @Input() p: PValue;

    constructor() { }

    ngOnInit() {
    }

}
