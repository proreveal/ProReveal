import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { forwardRef, Input, ViewChild, ElementRef } from '@angular/core'

import { Constants } from '../constants';
import { ExplorationNode } from './exploration-node';

@Component({
    selector: 'exploration-node-view',
    templateUrl: './exploration-node-view.component.html',
    styleUrls: ['./exploration-node-view.component.scss']
})
export class ExplorationNodeViewComponent implements OnInit {
    @Input() node: ExplorationNode;
    @Input() editable: boolean;

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
    selectorOpened = false;

    constructor() {
    }

    ngOnInit() {
    }

    // only applied to the child node
    toggle($event: MouseEvent, left: number, top: number, child: boolean) {
        $event.stopPropagation();
        if(this.selectorOpened) {
            this.selectorClosed();
            this.nodeUnselected.emit({
                node: this.node,
                nodeView: this,
                child: child
            });
        }
        else {
            this.selectorOpened = true;
            this.nodeSelected.emit({
                node: this.node,
                nodeView: this,
                child: child,
                left: left,
                top: top
            });
        }
    }

    selectorClosed() {
        this.selectorOpened = false;
    }
}
