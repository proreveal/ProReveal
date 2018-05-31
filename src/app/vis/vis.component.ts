import { Component, OnInit, Input, ElementRef, ViewChild, OnChanges, SimpleChange, SimpleChanges, DoCheck, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { ExplorationNode } from '../exploration/exploration-node';
import { HorizontalBarsRenderer } from './renderers/horizontal-bars';

@Component({
    selector: 'vis',
    templateUrl: './vis.component.html',
    styleUrls: ['./vis.component.css']
})
export class VisComponent implements OnInit, DoCheck {
    @Input() node: ExplorationNode;
    @ViewChild('svg') svg: ElementRef;

    queryLastUpdated: number;
    lastNode: ExplorationNode;
    renderer = new HorizontalBarsRenderer();

    constructor() { }

    ngOnInit() {
        this.queryLastUpdated = this.node.query.lastUpdated;

        this.renderer.setup(this.node, this.svg.nativeElement);
        this.renderer.render(this.node, this.svg.nativeElement);
    }

    ngDoCheck() {
        if (this.queryLastUpdated < this.node.query.lastUpdated || this.lastNode != this.node) {
            this.queryLastUpdated = this.node.query.lastUpdated;
            this.lastNode = this.node;

            this.renderer.render(this.node, this.svg.nativeElement);
        }
    }
}
