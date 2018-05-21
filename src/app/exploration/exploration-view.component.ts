import { Component, OnInit, ViewChild, EventEmitter, Output } from '@angular/core';
import { forwardRef, Input } from '@angular/core'
import { Constants } from '../constants';
import { ExplorationNode } from './exploration-node';
import { FieldSelectorComponent } from './field-selector/field-selector.component';
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
    @Output() fieldSelected: EventEmitter<{
        node: ExplorationNode,
        field: FieldTrait
    }> = new EventEmitter();

    @ViewChild('fieldSelector') fieldSelector: FieldSelectorComponent;

    constants = Constants;
    selectorVisible = false;
    selectorTop: number;
    selectorLeft: number;
    nodeView: ExplorationNodeViewComponent;
    node: ExplorationNode;
    editable: boolean = true;

    constructor() { }

    ngOnInit() {
    }

    openSelector(node: ExplorationNode, top: number, left: number, nodeView: ExplorationNodeViewComponent) {
        this.selectorVisible = true;
        this.node = node;
        this.nodeView = nodeView;
        this.selectorTop = top; // + Constants.nodeHeight / 2;
        this.selectorLeft = left + Constants.nodeWidth / 2;
    }

    closeSelector() {
        this.selectorVisible = false;
        if(this.nodeView)
            this.nodeView.closeSelector();
    }

    toggleEditable() {
        this.editable = !this.editable;
    }
}
