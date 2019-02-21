import { Component } from '@angular/core';
import { TooltipRendererTrait } from '../../tooltip/tooltip-renderer-trait';
import { FieldTrait } from '../../data/field';

@Component({
    selector: 'app-punchcard-tooltip',
    templateUrl: './punchcard-tooltip.component.html',
    //   styleUrls: ['./horizontal-bars-tooltip.component.css']
})
export class PunchcardTooltipComponent extends TooltipRendererTrait {
    isQuantitative(field: FieldTrait) { return field instanceof QuantitativeField; }

    constructor() {
        super();
    }
}
