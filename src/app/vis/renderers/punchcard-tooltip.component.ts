import { Component } from '@angular/core';
import { TooltipRendererTrait } from '../../tooltip/tooltip-renderer-trait';

@Component({
    selector: 'app-punchcard-tooltip',
    templateUrl: './punchcard-tooltip.component.html',
    //   styleUrls: ['./horizontal-bars-tooltip.component.css']
})
export class PunchcardTooltipComponent extends TooltipRendererTrait {
    constructor() {
        super();
    }
}
