import { Component, OnInit, Input, ElementRef, ViewChild, OnChanges, SimpleChange, SimpleChanges, DoCheck, ChangeDetectorRef, ChangeDetectionStrategy, Output, EventEmitter } from '@angular/core';
import { ExplorationNode } from '../exploration/exploration-node';
import { HorizontalBarsRenderer } from './renderers/horizontal-bars';
import { TooltipComponent } from '../tooltip/tooltip.component';
import { AggregateQuery } from '../data/query';
import { PunchcardRenderer } from './renderers/punchcard';
import { Renderer } from './renderers/renderer';
import * as d3 from 'd3';
import { AccumulatorTrait, SumAccumulator, MinAccumulator, MaxAccumulator, MeanAccumulator } from '../data/accumulator';
import { Safeguard, SafeguardTypes } from '../safeguard/safeguard';
import { ToastrService } from 'ngx-toastr';
import { FieldGroupedValueList } from '../data/field';
import { VariableTrait, VariableTypes } from '../safeguard/variable';
import { ConstantTrait } from '../safeguard/constant';

@Component({
    selector: 'vis',
    templateUrl: './vis.component.html',
    styleUrls: ['./vis.component.scss']
})
export class VisComponent implements OnInit, DoCheck {
    @Input() node: ExplorationNode;
    @Output('variableSelected') variableSelected: EventEmitter<{
        variable: VariableTrait,
        secondary?: boolean}>
        = new EventEmitter();

    @Output('constantSelected') constantSelected: EventEmitter<ConstantTrait>
        = new EventEmitter();

    @Output('safeguardAdded') safeguardAdded: EventEmitter<{
        'sg': Safeguard
    }> = new EventEmitter();
    @ViewChild('svg') svg: ElementRef<SVGSVGElement>;
    @ViewChild('tooltip') tooltip: TooltipComponent;

    queryLastUpdated: number;
    lastNode: ExplorationNode;
    renderer: Renderer;
    accumulators: AccumulatorTrait[] = [
        new SumAccumulator(),
        new MeanAccumulator(),
        new MaxAccumulator(),
        new MinAccumulator()
    ];
    creatingSg = false;


    constructor(private toastr: ToastrService
    ) { }

    recommend(query: AggregateQuery): Renderer {
        if (query.groupBy.fields.length === 1)
            return new HorizontalBarsRenderer(
                this,
                this.tooltip
            );

        if (query.groupBy.fields.length === 2)
            return new PunchcardRenderer(
                this,
                this.tooltip
            );

        return null;
    }

    ngOnInit() {
    }

    ngDoCheck() {
        if (this.node && this.svg &&
            (this.queryLastUpdated < this.node.query.lastUpdated || this.lastNode != this.node)) {
            this.queryLastUpdated = this.node.query.lastUpdated;

            if (this.lastNode !== this.node) {
                this.renderer = this.recommend(this.node.query as AggregateQuery);
                d3.select(this.svg.nativeElement).selectAll('*').remove();
                this.renderer.setup(this.node, this.svg.nativeElement);
            }

            this.lastNode = this.node;
            this.renderer.render(this.node, this.svg.nativeElement);
        }
    }

    highlight(highlighted: number) {
        this.renderer.highlight(highlighted);
    }

    setSafeguardType(set: SafeguardTypes) {
        this.renderer.setSafeguardType(set);
    }

    setVariableType(type: VariableTypes) {
        this.renderer.setVariableType(type);
        this.renderer.render(this.node, this.svg.nativeElement);
    }

    constantUserChanged(constant: ConstantTrait) {
        this.renderer.constantUserChanged(constant);
    }
}
