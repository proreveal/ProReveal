import { Component, OnInit, Input } from '@angular/core';
import { TooltipRendererTrait } from '../../tooltip/tooltip-renderer-trait';
import { Constants } from '../../constants';

@Component({
    selector: 'app-bars-tooltip',
    templateUrl: './bars-tooltip.component.html'
})
export class BarsTooltipComponent extends TooltipRendererTrait {
    L = Constants.locale;

    constructor() {
        super();
    }
}
