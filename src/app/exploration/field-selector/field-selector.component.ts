import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { getCurrentTarget } from '../../util';
import { Constants } from '../../constants';
import { FieldTrait } from '../../data/field';

@Component({
    selector: 'field-selector',
    templateUrl: './field-selector.component.html',
    styleUrls: ['./field-selector.component.scss']
})
export class FieldSelectorComponent implements OnInit {
    @Output('fieldSelected') fieldSelected: EventEmitter<FieldTrait> = new EventEmitter();

    fields:FieldTrait[] = [];
    constants = Constants;

    constructor() { }

    pie(startPointY, startAngle, endAngle) {
        const radius = Constants.columnSelectorRadius;
        const startPointX = radius;

        let x1 = startPointX + radius * Math.cos(Math.PI * startAngle / 180);
        let y1 = startPointY + radius * Math.sin(Math.PI * startAngle / 180);
        let x2 = startPointX + radius * Math.cos(Math.PI * endAngle / 180);
        let y2 = startPointY + radius * Math.sin(Math.PI * endAngle / 180);

        return `M${startPointX},${startPointY} L${x1},${y1} A${radius},${radius} 0 0,1 ${x2},${y2} z`;
    }

    ngOnInit() {
    }

    dragstart(event: DragEvent) {
        let target = getCurrentTarget(event);

        target.style.cursor = "move";
        event.dataTransfer.setDragImage(target, 0, 0);
    }

    drag(event) {
        console.log(event);
    }

    mousedown(event) {
        console.log(event);
    }

    open(fields:FieldTrait[]) {
        this.fields = fields;
    }

    close() {
        this.fields = [];
    }
}
