import { Component, OnInit, Input } from '@angular/core';
import { Safeguard, SafeguardTypes, DistributiveSafeguardTypes } from '../safeguard/safeguard';

@Component({
  selector: 'sg-display',
  templateUrl: './sg-display.component.html',
  styleUrls: ['./sg-style.scss']
})
export class SgDisplayComponent implements OnInit {
    @Input('safeguard') sg: Safeguard;
    SGT = SafeguardTypes;
    DSGT = DistributiveSafeguardTypes;

    constructor() { }

    ngOnInit() {
    }

}
