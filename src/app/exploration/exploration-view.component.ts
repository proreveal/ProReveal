import { Component, OnInit, ViewChild, EventEmitter, Output } from '@angular/core';
import { forwardRef, Input } from '@angular/core'
import { Constants } from '../constants';
import { ExplorationNode } from './exploration-node';
import { Dataset } from '../data/dataset';
import { FieldTrait } from '../data/field';
import { ExplorationNodeViewComponent } from './exploration-node-view.component';

@Component({
    selector: 'exploration-view',
    templateUrl: './exploration-view.component.html',
    styleUrls: ['./exploration-view.component.css']
})
export class ExplorationViewComponent implements OnInit {
    @Input() root: ExplorationNode;
    @Input() dataset: Dataset;

    @Output('nodeSelected') nodeSelected: EventEmitter<{
        'node': ExplorationNode,
        'nodeView': ExplorationNodeViewComponent,
        'child': boolean,
        'left': number,
        'top': number
    }> = new EventEmitter();

    @Output('nodeUnselected') nodeUnselected: EventEmitter<{
        'node': ExplorationNode,
        'nodeView': ExplorationNodeViewComponent,
        'child': boolean
    }> = new EventEmitter();

    constants = Constants;
    editable: boolean = true;

    constructor() { }

    ngOnInit() {
    }

    toggleEditable() {
        this.editable = !this.editable;
    }
}
