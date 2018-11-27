import { Component, OnInit, Input } from '@angular/core';
import { TooltipRendererTrait } from '../../tooltip/tooltip-renderer-trait';

@Component({
    selector: 'app-horizontal-bars-tooltip',
    templateUrl: './horizontal-bars-tooltip.component.html',
    //   styleUrls: ['./horizontal-bars-tooltip.component.css']
})
export class PunchcardTooltipComponent extends TooltipRendererTrait {
    constructor() {
        super();
    }
}
