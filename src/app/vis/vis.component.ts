import { Component, OnInit, Input, ElementRef, ViewChild, DoCheck, Output, EventEmitter } from '@angular/core';
import { ExplorationNode } from '../exploration/exploration-node';
import { HorizontalBarsRenderer } from './renderers/horizontal-bars';
import { TooltipComponent } from '../tooltip/tooltip.component';
import { AggregateQuery, Histogram2DQuery, Histogram1DQuery } from '../data/query';
import { PunchcardRenderer } from './renderers/punchcard';
import { Renderer } from './renderers/renderer';
import * as d3 from 'd3';
import { Safeguard, SafeguardTypes } from '../safeguard/safeguard';
import { VariableTrait, VariableTypes } from '../safeguard/variable';
import { ConstantTrait, FittingTypes } from '../safeguard/constant';
import { Constants as C } from '../constants';
import { QueryCreatorComponent } from '../query-creator/query-creator.component';
import { Priority } from '../data/engine';
import { Datum } from '../data/datum';

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

    @Output('queryCreated') queryCreated: EventEmitter<{}> = new EventEmitter();

    @ViewChild('svg') svg: ElementRef<SVGSVGElement>;
    @ViewChild('qc') queryCreator: QueryCreatorComponent;
    @ViewChild('tooltip') tooltip: TooltipComponent;

    Priority = Priority;

    lastUpdated: number = 0;
    lastNode: ExplorationNode;
    renderer: Renderer;
    limitNumCategories = false;
    numCategories = 0;

    isQueryCreatorVisible: boolean = false;
    queryCreatorTop: number = 500;
    queryCreatorDatum: Datum = null;

    constructor() {}

    recommend(query: AggregateQuery): Renderer {
        if (query.groupBy.fields.length === 1 && !(query instanceof Histogram2DQuery))
            return new HorizontalBarsRenderer(
                this,
                this.tooltip
            );

        if (query.groupBy.fields.length === 2 || query instanceof Histogram2DQuery)
            return new PunchcardRenderer(
                this,
                this.tooltip
            ) as any;

        return null;
    }

    ngOnInit() {

    }

    ngDoCheck() {
        if (this.node && this.svg &&
            (this.lastUpdated < this.node.query.lastUpdated || this.lastNode != this.node)) {
            this.lastUpdated = this.node.query.lastUpdated;

            if (this.lastNode !== this.node) {
                this.renderer = this.recommend(this.node.query as AggregateQuery);
                d3.select(this.svg.nativeElement).selectAll('*').remove();
                this.renderer.setup(this.node, this.svg.nativeElement);
            }

            console.info('render() called for ', this.renderer);
            this.lastNode = this.node;
            this.renderer.render(this.node, this.svg.nativeElement);
            this.isQueryCreatorVisible = false;
            this.limitNumCategories = false;

            if(this.renderer instanceof HorizontalBarsRenderer) {
                if(this.renderer.limitNumCategories &&
                    this.renderer.data.length > C.horizontalBars.initiallyVisibleCategories) {
                    this.limitNumCategories = true;
                    this.numCategories = this.renderer.data.length;
                }
            }
        }

        if(!this.node) this.lastNode = this.node;
    }

    showAllCategories() {
        if(this.limitNumCategories) {
            this.limitNumCategories = false;
            (this.renderer as HorizontalBarsRenderer).limitNumCategories = false;
            this.renderer.render(this.node, this.svg.nativeElement);
        }
    }

    forceUpdate() {
        this.renderer.render(this.node, this.svg.nativeElement);
    }

    highlight(highlighted: number) {
        if(this.renderer) this.renderer.highlight(highlighted);
    }

    setSafeguardType(set: SafeguardTypes) {
        if(!this.renderer) return;
        this.renderer.setSafeguardType(set);
        this.renderer.render(this.node, this.svg.nativeElement);
    }

    setVariableType(type: VariableTypes) {
        this.renderer.setVariableType(type);
        this.renderer.render(this.node, this.svg.nativeElement);
    }

    setFittingType(type: FittingTypes) {
        this.renderer.setFittingType(type);
        this.renderer.render(this.node, this.svg.nativeElement);
    }

    constantUserChanged(constant: ConstantTrait) {
        this.renderer.constantUserChanged(constant);
    }

    approximatorChanged() {
        this.node.domainStart = Number.MAX_VALUE;
        this.node.domainEnd = -Number.MAX_VALUE;
        this.forceUpdate();
    }

    splitBins() {
        if(!(this.node.query instanceof Histogram1DQuery)) return;
        if(this.node.query.aggregationLevel == this.node.query.minLevel) return;

        this.node.query.aggregationLevel /= 2;
        this.forceUpdate();
    }

    mergeBins() {
        if(!(this.node.query instanceof Histogram1DQuery)) return;
        if(this.node.query.aggregationLevel == this.node.query.maxLevel) return;

        this.node.query.aggregationLevel *= 2;
        this.forceUpdate();
    }
}
