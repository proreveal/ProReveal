import { Component, OnInit } from '@angular/core';
import { forwardRef, Input } from '@angular/core'
import { Constants } from '../constants';
import { ExplorationNode } from './exploration-node';

@Component({
    selector: 'exploration-view',
    templateUrl: './exploration-view.component.html',
    styleUrls: ['./exploration-view.component.css']
})
export class ExplorationViewComponent implements OnInit {
    @Input() root:ExplorationNode;
    constants = Constants;

    constructor() { }

    ngOnInit() {
    }

}
