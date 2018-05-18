import { Component, OnInit, Input } from '@angular/core';
import { getCurrentTarget } from '../../util';
import { Constants } from '../../constants';

@Component({
    selector: 'column-selector',
    templateUrl: './column-selector.component.html',
    styleUrls: ['./column-selector.component.scss']
})
export class ColumnSelectorComponent implements OnInit {
    @Input("width") width: number = 40;
    @Input("height") height: number = 40;

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

    open() {
    }

    click(event) {
        this.open();
    }
}
