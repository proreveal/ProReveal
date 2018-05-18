import { Component, OnInit } from '@angular/core';
import { forwardRef, Input, ViewChild, ElementRef } from '@angular/core'

import { Constants } from '../constants';
import { ExplorationNode } from './exploration-node';
import { ExplorationViewComponent } from './exploration-view.component';

@Component({
    selector: 'exploration-node-view',
    templateUrl: './exploration-node-view.component.html',
    styleUrls: ['./exploration-node-view.component.scss']
})
export class ExplorationNodeViewComponent implements OnInit {
    @Input() node:ExplorationNode;
    @Input() view:ExplorationViewComponent;

    constants = Constants;
    selectorVisible = false;

    constructor() {
    }

    ngOnInit() {
    }

    openSelector(top:number, left:number) {
        this.selectorVisible = true;

        this.view.openSelector(this.node, top, left, this);
    }

    closeSelector() {
        this.selectorVisible = false;
    }

    toggleSelector(top:number, left:number) {
        if(this.selectorVisible) this.closeSelector();
        else this.openSelector(top, left);
    }
}
