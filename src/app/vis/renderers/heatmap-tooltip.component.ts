import { Component } from '@angular/core';
import { TooltipRendererTrait } from '../../tooltip/tooltip-renderer-trait';
import { Constants } from '../../constants';

@Component({
    selector: 'app-heatmap-tooltip',
    templateUrl: './heatmap-tooltip.component.html'
})
export class HeatmapTooltipComponent extends TooltipRendererTrait {
    L = Constants.locale;

    constructor() {
        super();
    }
}
