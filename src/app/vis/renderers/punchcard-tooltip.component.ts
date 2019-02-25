import { Component } from '@angular/core';
import { TooltipRendererTrait } from '../../tooltip/tooltip-renderer-trait';
import { Constants } from '../../constants';

@Component({
    selector: 'app-punchcard-tooltip',
    templateUrl: './punchcard-tooltip.component.html'
})
export class PunchcardTooltipComponent extends TooltipRendererTrait {
    L = Constants.locale;

    constructor() {
        super();
    }
}
