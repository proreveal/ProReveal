import { Component, OnInit, Input, ElementRef, ViewChild, OnChanges, SimpleChange, SimpleChanges, DoCheck, ChangeDetectorRef, ChangeDetectionStrategy, Output } from '@angular/core';
import { ExplorationNode } from '../exploration/exploration-node';
import { HorizontalBarsRenderer } from './renderers/horizontal-bars';
import { TooltipComponent } from '../tooltip/tooltip.component';
import { AggregateQuery } from '../data/query';
import { PunchcardRenderer } from './renderers/punchcard';
import { Renderer } from './renderers/renderer';
import * as d3 from 'd3';
import { AccumulatorTrait, SumAccumulator, MinAccumulator, MaxAccumulator, MeanAccumulator } from '../data/accumulator';

@Component({
    selector: 'vis',
    templateUrl: './vis.component.html',
    styleUrls: ['./vis.component.css']
})
export class VisComponent implements OnInit, DoCheck {
    @Input() node: ExplorationNode;
    @ViewChild('svg') svg: ElementRef;
    @ViewChild('tooltip') tooltip: TooltipComponent;

    queryLastUpdated: number;
    lastNode: ExplorationNode;
    renderers: Renderer[];
    accumulators: AccumulatorTrait[] = [
        new SumAccumulator(),
        new MeanAccumulator(),
        new MaxAccumulator(),
        new MinAccumulator()
    ];

    constructor() { }

    recommend(query: AggregateQuery): Renderer[] {
        if(query.groupBy.fields.length === 1)
            return [new HorizontalBarsRenderer()];

        if(query.groupBy.fields.length === 2)
            return [new PunchcardRenderer()];

        return [];
    }

    ngOnInit() {
        this.queryLastUpdated = this.node.query.lastUpdated;

        this.renderers = this.recommend(this.node.query as AggregateQuery);

        this.renderers.forEach(renderer => {
            renderer.setup(this.node, this.svg.nativeElement);
            renderer.render(this.node, this.svg.nativeElement, this.tooltip);
        })
    }

    ngDoCheck() {
        if (this.queryLastUpdated < this.node.query.lastUpdated || this.lastNode != this.node) {
            this.queryLastUpdated = this.node.query.lastUpdated;

            if(this.lastNode !== this.node) {
                this.renderers = this.recommend(this.node.query as AggregateQuery);
                d3.select(this.svg.nativeElement).selectAll('*').remove();
                this.renderers.forEach(renderer => {
                    renderer.setup(this.node, this.svg.nativeElement);
                });
            }

            this.lastNode = this.node;
            this.renderers.forEach(renderer => {
                renderer.render(this.node, this.svg.nativeElement, this.tooltip);
            });
        }
    }
}
