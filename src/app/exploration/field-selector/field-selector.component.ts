import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { getCurrentTarget } from '../../util';
import { Constants } from '../../constants';
import { FieldTrait } from '../../data/field';
import { SpeechRecognition } from '../../speech';
import { levenshtein } from '../../util';
import { ChangeDetectorRef } from '@angular/core';

@Component({
    selector: 'field-selector',
    templateUrl: './field-selector.component.html',
    styleUrls: ['./field-selector.component.scss']
})
export class FieldSelectorComponent implements OnInit {
    @Output('fieldSelected') fieldSelected: EventEmitter<FieldTrait> = new EventEmitter();

    fields: FieldTrait[] = [];
    constants = Constants;
    speechRecognition = new SpeechRecognition(5000, this.speechRecognized.bind(this));
    highlightedFields: FieldTrait[] = [];

    constructor(private ref: ChangeDetectorRef) { }

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

    open(fields: FieldTrait[]) {
        this.fields = fields;
        this.speechRecognition.words(this.fields.map(f => f.name));
        this.speechRecognition.start();
        this.highlightedFields = [];
    }

    close() {
        this.speechRecognition.stop();
        this.fields = [];
        this.highlightedFields = [];
    }

    speechRecognized(event: any) {
        if (event.results.length && event.results[0].length) {
            let candidate: string = event.results[0][0].transcript;
            // or confidence

            let minDist = Number.MAX_VALUE, closestField: FieldTrait;

            this.fields.forEach(field => {
                let dist = levenshtein(candidate.toLowerCase(), field.name.toLowerCase());
                if (minDist > dist) {
                    minDist = dist;
                    closestField = field;
                }
            });

            this.highlightedFields = [closestField];
            this.ref.detectChanges();
        }
    }
}
