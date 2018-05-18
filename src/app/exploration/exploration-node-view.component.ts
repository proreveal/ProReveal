import { Component, OnInit } from '@angular/core';
import { forwardRef, Input, ViewChild, ElementRef } from '@angular/core'

import { Constants } from '../constants';
import { ExplorationNode } from './exploration-node';

@Component({
    selector: 'exploration-node-view',
    templateUrl: './exploration-node-view.component.html',
    styleUrls: ['./exploration-node-view.component.scss']
})
export class ExplorationNodeViewComponent implements OnInit {
    @Input() node:ExplorationNode;

    constants = Constants;
    selectorVisible = false;

    constructor() {
    }

    ngOnInit() {
    }

    openSelector() {
        this.selectorVisible = true;
    }

    closeSelector() {
        this.selectorVisible = false;
    }

    toggleSelector() {
        if(this.selectorVisible) this.closeSelector();
        else this.openSelector();
    }
}
