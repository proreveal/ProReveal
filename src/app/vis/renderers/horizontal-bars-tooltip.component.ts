import { Component, OnInit, Input } from '@angular/core';
import { TooltipRendererTrait } from '../../tooltip/tooltip-renderer-trait';
import { FieldTrait, QuantitativeField } from '../../data/field';

@Component({
    selector: 'app-horizontal-bars-tooltip',
    templateUrl: './horizontal-bars-tooltip.component.html',
    //   styleUrls: ['./horizontal-bars-tooltip.component.css']
})
export class HorizontalBarsTooltipComponent extends TooltipRendererTrait {
    isQuantitative(field: FieldTrait) { return field instanceof QuantitativeField; }

    constructor() {
        super();
    }
}
