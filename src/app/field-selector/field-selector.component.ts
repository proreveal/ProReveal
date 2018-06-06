import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { getCurrentTarget } from '../util';
import { Constants } from '../constants';
import { FieldTrait } from '../data/field';
import { SpeechRecognition } from '../speech';
import { levenshtein } from '../util';
import { ChangeDetectorRef } from '@angular/core';
import { Floating } from '../floating';
import { ExplorationNode } from '../exploration/exploration-node';
import { SpeechRecognitionService } from '../speech-recognition.service';

@Component({
    selector: 'field-selector',
    templateUrl: './field-selector.component.html',
    styleUrls: ['./field-selector.component.scss']
})
export class FieldSelectorComponent extends Floating implements OnInit {
    @Output('fieldSelected') fieldSelected: EventEmitter<FieldTrait> = new EventEmitter();

    fields: FieldTrait[] = [];
    constants = Constants;
    highlightedFields: FieldTrait[] = [];
    node: ExplorationNode;

    constructor(private ref: ChangeDetectorRef, private speech:SpeechRecognitionService) {
        super();
    }

    ngOnInit() {
    }

    show(left:number, top:number, fields: FieldTrait[], node: ExplorationNode) {
        super.show(left, top);

        this.fields = fields;
        this.speech.start(this.fields.map(f => f.name),
            this.speechRecognized.bind(this)
        );
        this.highlightedFields = [];
        this.node = node;
    }

    hide() {
        super.hide();

        this.speech.stop();
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
