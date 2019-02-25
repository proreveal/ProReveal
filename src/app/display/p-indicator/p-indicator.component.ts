import { Component, OnInit, Input } from '@angular/core';
import { PValue } from '../../safeguard/validity';
import { Constants } from '../../constants';

@Component({
  selector: 'p-indicator',
  templateUrl: './p-indicator.component.html'
})
export class PIndicatorComponent implements OnInit {
    @Input() p: PValue;

    L = Constants.locale;

    constructor() { }

    ngOnInit() {
    }

}
