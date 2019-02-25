import { Component, OnInit, Input } from '@angular/core';
import { TooltipRendererTrait } from '../../tooltip/tooltip-renderer-trait';
import { Constants } from '../../constants';

@Component({
    selector: 'app-horizontal-bars-tooltip',
    templateUrl: './horizontal-bars-tooltip.component.html'
})
export class HorizontalBarsTooltipComponent extends TooltipRendererTrait {
    L = Constants.locale;

    constructor() {
        super();
    }
}
