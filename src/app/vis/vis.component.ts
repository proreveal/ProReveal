import { Component, OnInit, Input, ElementRef, ViewChild, DoCheck, Output, EventEmitter, AfterViewInit, AfterViewChecked } from '@angular/core';
import { BarsRenderer } from './renderers/bars';
import { TooltipComponent } from '../tooltip/tooltip.component';
import { AggregateQuery, Histogram2DQuery, Histogram1DQuery } from '../data/query';
import { HeatmapRenderer } from './renderers/heatmap';
import * as d3 from 'd3';
import { Safeguard, SafeguardTypes } from '../safeguard/safeguard';
import { VariableTrait } from '../safeguard/variable';
import { ConstantTrait } from '../safeguard/constant';
import { Constants as C, Constants } from '../constants';
import { QueryCreatorComponent } from '../query-creator/query-creator.component';
import { Priority } from '../engine/priority';
import { Datum } from '../data/datum';
import { LoggerService, LogType } from '../services/logger.service';
import { StorageService } from '../services/storage.service';
import { VisGridSet } from './vis-grid';

@Component({
    selector: 'vis',
    templateUrl: './vis.component.html',
    styleUrls: ['./vis.component.scss']
})
export class VisComponent implements AfterViewChecked, AfterViewInit {
    @Input() query: AggregateQuery;
    @Input() floatingLegend: HTMLDivElement;
    @Input() minimap: HTMLDivElement;

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

    @ViewChild('svg', { static: false }) svg: ElementRef<SVGSVGElement>;
    @ViewChild('xTitle', { static: false }) xTitle: ElementRef<SVGSVGElement>;
    @ViewChild('xLabels', { static: false }) xLabels: ElementRef<SVGSVGElement>;
    @ViewChild('yTitle', { static: false }) yTitle: ElementRef<SVGSVGElement>;
    @ViewChild('yLabels', { static: false }) yLabels: ElementRef<SVGSVGElement>;
    @ViewChild('xyTitle', { static: false }) xyTitle: ElementRef<SVGSVGElement>;
    @ViewChild('visGrid', { static: false }) visGrid: ElementRef<HTMLDivElement>;

    @ViewChild('qc', { static: false }) queryCreator: QueryCreatorComponent;
    @ViewChild('tooltip', { static: false }) tooltip: TooltipComponent;

    L = Constants.locale;

    Priority = Priority;
    SGT = SafeguardTypes;

    S = Constants.locale.guardShortNames.desktop;

    lastUpdated: number = 0;
    lastQuery: AggregateQuery;
    renderer: BarsRenderer | HeatmapRenderer;
    limitNumCategories = false;
    numCategories = 0;

    isDropdownVisible = false;
    dropdownTop = 500;
    dropdownLeft = 500;

    isQueryCreatorVisible = false;
    queryCreatorTop = 500;
    queryCreatorLeft = 500;
    selectedDatum: Datum = null;

    visGridSet: VisGridSet;
    isMobile = false;

    constructor(private logger: LoggerService, private storage: StorageService) {
        this.isMobile = storage.isMobile();
        if(this.isMobile) {
            this.S = Constants.locale.guardShortNames.mobile;
        }
    }

    recommend(query: AggregateQuery) {
        if (query.groupBy.fields.length === 1 && !(query instanceof Histogram2DQuery))
            return new BarsRenderer(
                this,
                this.tooltip,
                this.logger,
                this.storage.isMobile()
            );

        if (query.groupBy.fields.length === 2 || query instanceof Histogram2DQuery)
            return new HeatmapRenderer(
                this,
                this.tooltip,
                this.logger,
                this.storage.isMobile()
            ) as any;

        return null;
    }

    ngAfterViewInit() {
        this.visGridSet = new VisGridSet(
            this.svg.nativeElement,
            this.xTitle.nativeElement,
            this.xLabels.nativeElement,
            this.yTitle.nativeElement,
            this.yLabels.nativeElement,
            this.xyTitle.nativeElement,
            this.visGrid.nativeElement
        );
    }

    ngAfterViewChecked() {
        if (this.query && this.svg &&
            (this.lastUpdated < this.query.lastUpdated || this.lastQuery != this.query)) {
            this.lastUpdated = this.query.lastUpdated;

            if (this.lastQuery !== this.query) {
                this.renderer = this.recommend(this.query);

                this.visGridSet.empty();
                d3.select(this.minimap).selectAll('svg *').remove();

                this.renderer.setup(this.query, this.visGridSet,
                    this.floatingLegend);
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
            this.renderer.render(this.query, this.visGridSet as any, this.floatingLegend, this.minimap);
        }
    }

    forceUpdate() {
        this.renderer.render(this.query, this.visGridSet as any, this.floatingLegend, this.minimap);
        this.limitNumCategories = false;

        if (this.renderer instanceof BarsRenderer) {
            if (this.renderer.limitNumCategories &&
                this.renderer.data.length > C.bars.initiallyVisibleCategories) {
                this.limitNumCategories = true;
                this.numCategories = this.renderer.data.length;
            }
        }
        else if (this.renderer instanceof HeatmapRenderer) {
            const numCategories = Math.max(this.renderer.xValuesCount, this.renderer.yValuesCount);

            if (this.renderer.limitNumCategories &&
                numCategories > C.heatmap.initiallyVisibleCategories) {
                this.limitNumCategories = true;
                this.numCategories = numCategories;
            }
        }
    }

    setSafeguardType(set: SafeguardTypes) {
        if (!this.renderer) return;
        this.renderer.setSafeguardType(set);
        this.renderer.render(this.query, this.visGridSet as any, this.floatingLegend, this.minimap);
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
        this.renderer.closeDropdown();
        if(this.isMobile) this.renderer.hideTooltip();
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

    queryCreatorCreationCancelled() {
        this.isQueryCreatorVisible = false;
        this.emptySelectedDatum();
    }

    emptySelectedDatum() {
        if (this.renderer)
            this.renderer.removeMenuHighlighted();
        this.selectedDatum = null;
    }
}
