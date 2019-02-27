import { Component, OnInit, Input, ElementRef, ViewChild, DoCheck, Output, EventEmitter } from '@angular/core';
import { HorizontalBarsRenderer } from './renderers/horizontal-bars';
import { TooltipComponent } from '../tooltip/tooltip.component';
import { AggregateQuery, Histogram2DQuery, Histogram1DQuery } from '../data/query';
import { PunchcardRenderer } from './renderers/punchcard';
import * as d3 from 'd3';
import { Safeguard, SafeguardTypes } from '../safeguard/safeguard';
import { VariableTrait } from '../safeguard/variable';
import { ConstantTrait } from '../safeguard/constant';
import { Constants as C, Constants } from '../constants';
import { QueryCreatorComponent } from '../query-creator/query-creator.component';
import { Priority } from '../data/engine';
import { Datum } from '../data/datum';
import { LoggerService, LogType } from '../logger.service';

@Component({
    selector: 'vis',
    templateUrl: './vis.component.html',
    styleUrls: ['./vis.component.scss']
})
export class VisComponent implements DoCheck {
    @Input() query: AggregateQuery;
    @Input() floatingSvg: HTMLDivElement;

    @Output('variableSelected') variableSelected: EventEmitter<{
        variable: VariableTrait,
        secondary?: boolean
    }>
        = new EventEmitter();

    @Output('constantSelected') constantSelected: EventEmitter<ConstantTrait>
        = new EventEmitter();

    @Output('queryCreated') queryCreated: EventEmitter<{}> = new EventEmitter();

    @Output('numBinsChanged') numBinsChanged: EventEmitter<{}> = new EventEmitter();
    @Output('sgPanelRequested') sgPanelRequested: EventEmitter<SafeguardTypes> = new EventEmitter();
    @Output('dataViewerRequested') dataViewerRequested: EventEmitter<Datum> = new EventEmitter();

    @ViewChild('svg') svg: ElementRef<SVGSVGElement>;
    //@ViewChild('floatingSvg') floatingSvg: ElementRef<SVGSVGElement>;

    @ViewChild('qc') queryCreator: QueryCreatorComponent;
    @ViewChild('tooltip') tooltip: TooltipComponent;

    L = Constants.locale;

    Priority = Priority;
    SGT = SafeguardTypes;

    lastUpdated: number = 0;
    lastQuery: AggregateQuery;
    renderer: HorizontalBarsRenderer | PunchcardRenderer;
    limitNumCategories = false;
    numCategories = 0;

    isDropdownVisible = false;
    dropdownTop = 500;
    dropdownLeft = 500;

    isQueryCreatorVisible = false;
    queryCreatorTop = 500;
    queryCreatorLeft = 500;
    selectedDatum: Datum = null;

    constructor(private logger: LoggerService) { }

    recommend(query: AggregateQuery) {
        if (query.groupBy.fields.length === 1 && !(query instanceof Histogram2DQuery))
            return new HorizontalBarsRenderer(
                this,
                this.tooltip,
                this.logger
            );

        if (query.groupBy.fields.length === 2 || query instanceof Histogram2DQuery)
            return new PunchcardRenderer(
                this,
                this.tooltip,
                this.logger
            ) as any;

        return null;
    }

    ngDoCheck() {
        if (this.query && this.svg &&
            (this.lastUpdated < this.query.lastUpdated || this.lastQuery != this.query)) {
            this.lastUpdated = this.query.lastUpdated;

            if (this.lastQuery !== this.query) {
                this.renderer = this.recommend(this.query);
                d3.select(this.svg.nativeElement).selectAll('*').remove();
                this.renderer.setup(this.query, this.svg.nativeElement,
                    this.floatingSvg);
                this.isDropdownVisible = false;
                this.isQueryCreatorVisible = false;
            }

            console.info('render() called for ', this.renderer);
            this.lastQuery = this.query;

            this.forceUpdate();
        }

        if (!this.query) this.lastQuery = this.query;
    }

    showAllCategories() {
        if (this.limitNumCategories) {
            this.limitNumCategories = false;
            this.renderer.limitNumCategories = false;
            this.renderer.render(this.query, this.svg.nativeElement, this.floatingSvg);
        }
    }

    forceUpdate() {
        this.renderer.render(this.query, this.svg.nativeElement, this.floatingSvg);
        this.limitNumCategories = false;

        if (this.renderer instanceof HorizontalBarsRenderer) {
            if (this.renderer.limitNumCategories &&
                this.renderer.data.length > C.horizontalBars.initiallyVisibleCategories) {
                this.limitNumCategories = true;
                this.numCategories = this.renderer.data.length;
            }
        }
        else if (this.renderer instanceof PunchcardRenderer) {
            const numCategories = Math.max(this.renderer.xValuesCount, this.renderer.yValuesCount);

            if (this.renderer.limitNumCategories &&
                numCategories > C.punchcard.initiallyVisibleCategories) {
                this.limitNumCategories = true;
                this.numCategories = numCategories;
            }
        }
    }

    setSafeguardType(set: SafeguardTypes) {
        if (!this.renderer) return;
        this.renderer.setSafeguardType(set);
        this.renderer.render(this.query, this.svg.nativeElement, this.floatingSvg);
    }

    constantUserChanged(constant: ConstantTrait) {
        this.renderer.constantUserChanged(constant);
    }

    approximatorChanged() {
        this.query.domainStart = Number.MAX_VALUE;
        this.query.domainEnd = -Number.MAX_VALUE;
        this.forceUpdate();
    }

    splitBins() {
        if (!(this.query instanceof Histogram1DQuery)) return;
        if (this.query.aggregationLevel == this.query.minLevel) return;
        if (this.query.safeguards.length > 0) return;

        this.query.aggregationLevel /= 2;
        this.isQueryCreatorVisible = false;
        this.isDropdownVisible = false;
        this.forceUpdate();
        this.numBinsChanged.emit();
    }

    mergeBins() {
        if (!(this.query instanceof Histogram1DQuery)) return;
        if (this.query.aggregationLevel == this.query.maxLevel) return;
        if (this.query.safeguards.length > 0) return;

        this.query.aggregationLevel *= 2;
        this.isQueryCreatorVisible = false;
        this.isDropdownVisible = false;
        this.forceUpdate();
        this.numBinsChanged.emit();
    }

    splitXBins() {
        if (!(this.query instanceof Histogram2DQuery)) return;
        if (this.query.aggregationLevelX == this.query.minLevelX) return;
        if (this.query.safeguards.length > 0) return;

        this.query.aggregationLevelX /= 2;
        this.isQueryCreatorVisible = false;
        this.isDropdownVisible = false;
        this.forceUpdate();
        this.numBinsChanged.emit();
    }

    mergeXBins() {
        if (!(this.query instanceof Histogram2DQuery)) return;
        if (this.query.aggregationLevelX == this.query.maxLevelX) return;
        if (this.query.safeguards.length > 0) return;

        this.query.aggregationLevelX *= 2;
        this.isQueryCreatorVisible = false;
        this.isDropdownVisible = false;
        this.forceUpdate();
        this.numBinsChanged.emit();
    }

    splitYBins() {
        if (!(this.query instanceof Histogram2DQuery)) return;
        if (this.query.aggregationLevelY == this.query.minLevelY) return;
        if (this.query.safeguards.length > 0) return;

        this.query.aggregationLevelY /= 2;
        this.isQueryCreatorVisible = false;
        this.isDropdownVisible = false;
        this.forceUpdate();
        this.numBinsChanged.emit();
    }

    mergeYBins() {
        if (!(this.query instanceof Histogram2DQuery)) return;
        if (this.query.aggregationLevelY == this.query.maxLevelY) return;
        if (this.query.safeguards.length > 0) return;

        this.query.aggregationLevelY *= 2;
        this.isQueryCreatorVisible = false;
        this.isDropdownVisible = false;
        this.forceUpdate();
        this.numBinsChanged.emit();
    }

    backgroundClick() {
        this.isDropdownVisible = false;
        this.isQueryCreatorVisible = false;
        this.emptySelectedDatum();
    }

    filterClick() {
        this.isDropdownVisible = false;

        this.renderer.openQueryCreator(this.selectedDatum);
        this.logger.log(LogType.QueryCreatorOpened, true);

        return false;
    }

    safeguardClick(sgt: SafeguardTypes) {
        this.sgPanelRequested.emit(sgt);
        this.renderer.datumSelected(this.selectedDatum);

        this.isDropdownVisible = false;
        this.isQueryCreatorVisible = false;
        this.emptySelectedDatum();
        return false;
    }

    detailClick() {
        this.dataViewerRequested.emit(this.selectedDatum);
        this.isDropdownVisible = false;
        this.isQueryCreatorVisible = false;
        this.emptySelectedDatum();
        return false;
    }

    queryCreatorCreated($event) {
        this.queryCreated.emit($event);
        this.isQueryCreatorVisible = false;
        this.emptySelectedDatum();
    }

    queryCreatorCreationCancelled($event) {
        this.isQueryCreatorVisible = false;
        this.emptySelectedDatum();
    }

    emptySelectedDatum() {
        if(this.renderer)
            this.renderer.emptySelectedDatum();
        this.selectedDatum = null;
    }
}
