import { Component, OnInit, ViewChild, ElementRef, TemplateRef } from '@angular/core';
import { FieldTrait, VlType } from './data/field';
import { Engine, Priority } from './data/engine';

import { Query, EmptyQuery, AggregateQuery, Histogram1DQuery, Histogram2DQuery, QueryState } from './data/query';
import { MetadataEditorComponent } from './metadata-editor/metadata-editor.component';
import * as util from './util';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Safeguard, SafeguardTypes as SGT, PointSafeguard, RangeSafeguard, ComparativeSafeguard, DistributiveSafeguard, SafeguardTypes } from './safeguard/safeguard';
import { VisComponent } from './vis/vis.component';
import { Operators } from './safeguard/operator';
import { VariablePair, SingleVariable, VariableTypes, CombinedVariable, VariableTrait, CombinedVariablePair } from './safeguard/variable';
import { ConstantTrait, PointRankConstant, PointValueConstant, RangeValueConstant, RangeRankConstant, PowerLawConstant, NormalConstant, FittingTypes, LinearRegressionConstant } from './safeguard/constant';
import { of, interval, Subscription } from 'rxjs';
import { delay } from 'rxjs/operators';
import { HorizontalBarsRenderer } from './vis/renderers/horizontal-bars';
import { PointValueEstimator, ComparativeEstimator, RangeValueEstimator, PointRankEstimator, PowerLawEstimator, NormalEstimator, LinearRegressionEstimator, PointMinMaxValueEstimator, PointMinMaxRankValueEstimator } from './safeguard/estimate';
import { PunchcardRenderer } from './vis/renderers/punchcard';
import { isNull } from 'util';
import { Constants as C } from './constants';
import { AndPredicate, EqualPredicate } from './data/predicate';
import { RoundRobinScheduler, QueryOrderScheduler } from './data/scheduler';
import { Datum } from './data/datum';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
    SGT = SGT;
    QS = QueryState;
    C = C;
    VT = VariableTypes;
    Operators = Operators;
    Priority = Priority;
    PointValueEstimate = new PointValueEstimator().estimate;
    PointMinMaxValueEstimate = new PointMinMaxValueEstimator().estimate;
    PointRankEstimate = new PointRankEstimator().estimate;
    PointMinMaxRankEstimate = new PointMinMaxRankValueEstimator().estimate;
    RangeValueEstimate = new RangeValueEstimator().estimate;
    ComparativeEstimate = new ComparativeEstimator().estimate;
    PowerLawEstimate = new PowerLawEstimator().estimate;
    NormalEstimate = new NormalEstimator().estimate;
    LinearRegressionEstimate = new LinearRegressionEstimator().estimate;

    @ViewChild('metadataEditor') metadataEditor: MetadataEditorComponent;
    @ViewChild('vis') vis: VisComponent;

    @ViewChild('dataViewerModal') dataViewerModal: TemplateRef<ElementRef>;

    engine: Engine;

    activeQuery: AggregateQuery = null;
    highlightedQuery: AggregateQuery = null;

    sortablejsOptions: any;

    activeSafeguardPanel = SGT.None;
    safeguards: Safeguard[] = [];
    isPlaying = false;

    creating = false;

    queries: AggregateQuery[] = [];
    isDistributivePossible = true;

    variable1: SingleVariable;
    variable2: SingleVariable;
    variablePair: VariablePair;
    combinedVariable1: CombinedVariable;
    combinedVariable2: CombinedVariable;
    combinedVariablePair: CombinedVariablePair;
    useRank = false;
    useLinear = false;
    useNormal = true;
    isNormalFittingAvailable = false;
    isPowerLawFittingAvailable = false;

    pointValueConstant: PointValueConstant = new PointValueConstant(0);
    pointRankConstant: PointRankConstant = new PointRankConstant(1);

    rangeValueConstant: RangeValueConstant = new RangeValueConstant(0, 1);
    rangeRankConstant: RangeRankConstant = new RangeRankConstant(1, 2);

    powerLawConstant: PowerLawConstant = new PowerLawConstant();
    normalConstant: NormalConstant = new NormalConstant();
    linearRegressionConstant: LinearRegressionConstant = new LinearRegressionConstant();
    filteredRows: any[] = [];

    operator = Operators.LessThanOrEqualTo;

    constructor(private modalService: NgbModal) {
        this.sortablejsOptions = {
            onUpdate: () => {
                this.engine.queue.reschedule();
            }
        };
    }

    ngOnInit() {
        this.engine = new Engine('./assets/movies.json', './assets/movies.schema.json');

        this.engine.queryDone = this.queryDone.bind(this);

        this.engine.load().then(([dataset, schema]) => {
            dataset.fields.forEach(field => {
                if (field.vlType !== VlType.Key) {
                    this.create(new EmptyQuery(dataset).combine(field));
                }
            });

            this.querySelected(this.engine.ongoingQueries[0]);

            // Just run 10 jobs.
            this.run(10);

            // C (Frequency histogram, Creative_Type)
            // this.nodeSelected(this.ongoingNodes[0])
            // this.run(5);

            // N (1D histogram, IMDB_Rating)
            // this.nodeSelected(this.ongoingNodes[3]);
            // this.run(105);

            // CN (Bar chart, Sum(Production_Budget) by Creative_Type)
            // const [node, query] = this.fieldSelected(this.ongoingNodes[0], dataset.getFieldByName('Production_Budget'));
            // this.run(5);

            // NN (2D Histogram, IMDB_Rating vs Production_Budget)
            // this.fieldSelected(this.ongoingNodes[3], dataset.getFieldByName('Production_Budget'));
            // this.run(10);

            // CC (Creative_Type vs Major_Genre)
            // const [] = this.fieldSelected(this.ongoingNodes[0], dataset.getFieldByName('Major_Genre'));
            // this.run(10);

            // this.testC();

            // this.toggleMetadataEditor();

            // this.testEqualWhere();
            // this.testCC();

            // this.testN();
            // this.testCN();

            of(0).pipe(
                delay(1000)
            ).subscribe(() => {

                // this.toggle(SGT.Point);

                // this.useRank = true;
                // this.useRankToggled();
            })
        })

    }

    testEqualWhere() {
        let whereField = this.engine.dataset.getFieldByName('Creative_Type');
        let where = new AndPredicate([new EqualPredicate(whereField, 'Contemporary Fiction')]);

        let visField = this.engine.dataset.getFieldByName('IMDB_Rating');

        let query = (new EmptyQuery(this.engine.dataset)).combine(visField);
        query.where = where;

        this.create(query, Priority.Highest);

        this.run(10);
    }

    testC() {
        this.run(5);
    }

    testN() {
        this.querySelected(this.engine.ongoingQueries[4]);
        this.run(145);
    }

    testCN() {
        let field1 = this.engine.dataset.getFieldByName('Creative_Type');
        let field2 = this.engine.dataset.getFieldByName('Production_Budget');

        let query = (new EmptyQuery(this.engine.dataset)).combine(field1).combine(field2);
        this.create(query, Priority.Highest);

        this.run(5);
    }

    testNN() {
        let field1 = this.engine.dataset.getFieldByName('Production_Budget');
        let field2 = this.engine.dataset.getFieldByName('IMDB_Rating');

        let query = (new EmptyQuery(this.engine.dataset)).combine(field1).combine(field2);
        this.create(query, Priority.Highest);

        this.run(10);
    }

    testCC() {
        let field1 = this.engine.dataset.getFieldByName('Creative_Type');
        let field2 = this.engine.dataset.getFieldByName('Major_Genre');

        let query = (new EmptyQuery(this.engine.dataset)).combine(field1).combine(field2);
        this.create(query, Priority.Highest)

        this.run(10);
    }

    create(query: AggregateQuery, priority = Priority.Lowest) {

        this.queries.push(query);

        this.engine.request(query, priority);

        this.querySelected(query);

        this.creating = false;
    }

    toggleMetadataEditor() {
        this.metadataEditor.toggle();
    }

    run(times: number, simulatedDelay = 0) {
        for (let i = 0; i < times; i++)
            this.engine.run(simulatedDelay);
    }

    queryDone(query: Query) {
        this.safeguards.forEach(sg => {
            if (sg.lastUpdated < sg.query.lastUpdated) {
                sg.lastUpdated = sg.query.lastUpdated;
                sg.lastUpdatedAt = new Date(sg.query.lastUpdated);

                sg.history.push(sg.validity());
            }

            if (sg instanceof DistributiveSafeguard && sg.query === query) {
                sg.updateConstant();
            }
        })

        if(this.activeSafeguardPanel === SGT.Distributive) {
            if(this.useLinear)
                (this.vis.renderer as PunchcardRenderer).setDefaultConstantFromVariable(true);
            else
                (this.vis.renderer as HorizontalBarsRenderer).setDefaultConstantFromVariable(true);
        }
    }

    rankAllowed() {
        return this.activeQuery && this.activeQuery.rankAvailable;
    }

    querySelected(q: Query) {
        let query = q as AggregateQuery;

        if (this.activeQuery === query)
            this.activeQuery = null;
        else if (this.activeQuery) {
            this.activeQuery.updateAutomatically = true;
            this.activeQuery = query;
            this.toggle(SGT.None);
        }
        else {
            this.activeQuery = query;
        }

        if (!this.rankAllowed()) this.useRank = false;
        if (this.activeQuery) {
            // normal fitting: only for 1D histogram
            // power law: always possible

            this.isNormalFittingAvailable = this.activeQuery instanceof Histogram1DQuery;

            this.useNormal = this.isNormalFittingAvailable;

            this.isDistributivePossible = !(this.activeQuery.groupBy.fields.length == 2
                && this.activeQuery.groupBy.fields[0].vlType != VlType.Quantitative);
        }
    }

    queryPauseClick(query: AggregateQuery, $event: UIEvent){
        query.pause();
        this.engine.reschedule();
        $event.stopPropagation();
        return false;
    }

    queryRunClick(query: AggregateQuery, $event: UIEvent){
        query.run();
        this.engine.reschedule();
        $event.stopPropagation();
        return false;
    }

    highlighted = 0;
    highlight(highlighted: number) {
        this.highlighted = highlighted;
        this.vis.highlight(highlighted);
    }

    constantUserChanged(constant: ConstantTrait) {
        this.constantSelected(constant); // set the operator automatically
        this.vis.constantUserChanged(constant);
    }

    createPointSafeguard() {
        let variable = this.variable1 || this.combinedVariable1;
        if (!variable) return;

        if (this.variable1) this.variable1.isRank = this.useRank;
        let sg: PointSafeguard;

        if (this.useRank) sg = new PointSafeguard(variable, this.operator, this.pointRankConstant, this.activeQuery);
        else sg = new PointSafeguard(variable, this.operator, this.pointValueConstant, this.activeQuery);

        sg.history.push(sg.validity());
        this.safeguards.push(sg);
        this.activeQuery.safeguards.push(sg);

        this.variable1 = null;
        this.pointRankConstant = null;
        this.pointValueConstant = null;
        this.toggle(SGT.None);
    }

    createRangeSafeguard() {
        let variable = this.variable1 || this.combinedVariable1;
        if (!variable) return;

        if (this.variable1) this.variable1.isRank = this.useRank;
        let sg: RangeSafeguard;
        if (this.useRank) sg = new RangeSafeguard(variable, this.rangeRankConstant, this.activeQuery);
        else sg = new RangeSafeguard(variable, this.rangeValueConstant, this.activeQuery);

        this.safeguards.push(sg);
        this.activeQuery.safeguards.push(sg);
        sg.history.push(sg.validity());

        this.variable1 = null;
        this.rangeRankConstant = null;
        this.rangeValueConstant = null;
        this.toggle(SGT.None);
    }

    createComparativeSafeguard() {
        let variable = this.variablePair || this.combinedVariablePair;
        if (!variable) return;

        let sg = new ComparativeSafeguard(
            variable, this.operator, this.activeQuery);
        sg.history.push(sg.validity());
        this.safeguards.push(sg);
        this.activeQuery.safeguards.push(sg);

        this.variable1 = null;
        this.variable2 = null;
        this.toggle(SGT.None);
    }

    createDistributiveSafeguard() {
        let sg: DistributiveSafeguard;
        if(!this.useLinear && this.useNormal)
            sg = new DistributiveSafeguard(this.normalConstant, this.activeQuery);
        else if(!this.useLinear && !this.useNormal)
            sg = new DistributiveSafeguard(this.powerLawConstant, this.activeQuery);
        else if(this.useLinear)
            sg = new DistributiveSafeguard(this.linearRegressionConstant, this.activeQuery);

        sg.history.push(sg.validity());
        this.safeguards.push(sg)
        this.activeQuery.safeguards.push(sg);

        this.toggle(SGT.None);
    }

    cancelSafeguard() {
        this.activeSafeguardPanel = SGT.None;
        this.vis.setSafeguardType(SGT.None);
    }

    toggle(sgt: SGT) {
        this.variable1 = null;
        this.variable2 = null;
        this.variablePair = null;
        this.combinedVariable1 = null;
        this.combinedVariable2 = null;
        this.combinedVariablePair = null;

        if (this.activeSafeguardPanel === SGT.None && sgt != SGT.None) {
            if (isNull(this.activeQuery)) return;
        }

        if (this.activeSafeguardPanel === sgt) {
            this.cancelSafeguard();
        }
        else {
            this.pointValueConstant = new PointValueConstant(0);
            this.pointRankConstant = new PointRankConstant(1);
            this.rangeValueConstant = new RangeValueConstant(0, 1);
            this.rangeRankConstant = new RangeRankConstant(1, 2);
            this.powerLawConstant = new PowerLawConstant();
            this.normalConstant = new NormalConstant();

            this.useRank = false;
            this.useLinear = false;

            if (this.activeQuery instanceof Histogram2DQuery && sgt === SafeguardTypes.Distributive) {
                this.useLinear = true;
            }
            else if (sgt === SafeguardTypes.Distributive) {
                this.vis.setFittingType(this.useNormal ? FittingTypes.Normal : FittingTypes.PowerLaw);
                (this.vis.renderer as HorizontalBarsRenderer).setDefaultConstantFromVariable(true);
                this.vis.forceUpdate();
            }

            this.activeSafeguardPanel = sgt;
            this.vis.setSafeguardType(sgt);
            this.vis.setVariableType(this.useRank ? VariableTypes.Rank : VariableTypes.Value);
        }
    }

    useNormalToggled() {
        this.vis.setFittingType(this.useNormal ? FittingTypes.Normal : FittingTypes.PowerLaw);
        (this.vis.renderer as HorizontalBarsRenderer).setDefaultConstantFromVariable(true);
        this.vis.forceUpdate();
    }

    useRankToggled() {
        this.vis.setVariableType(this.useRank ? VariableTypes.Rank : VariableTypes.Value);
    }

    checkOrder() {
        this.rangeValueConstant.checkOrder();
        this.rangeRankConstant.checkOrder();
    }

    toNumber(s: string) {
        let num = +s.replace(/,/g, '');
        if (isNaN(num)) num = 0;
        return num;
    }

    subs: Subscription;
    play() {
        this.isPlaying = true;
        let counter = interval(3000);
        this.run(1, 2500);
        this.subs = counter.subscribe(() => {
            this.run(1, 2500);
        })
    }

    pause() {
        this.isPlaying = false;
        this.subs.unsubscribe();
    }

    // from vis events

    visBackgroundClick() {
        this.vis.backgroundClick();
    }

    queryCreated($event: any) {
        let query: AggregateQuery = $event.query;

        this.create(query, Priority.Highest);
    }

    variableSelected($event: { variable: VariableTrait, secondary?: boolean }) {
        let variable = $event.variable;

        if (variable instanceof SingleVariable) {
            if ($event.secondary)
                this.variable2 = variable;
            else
                this.variable1 = variable;
        }
        else if (variable instanceof CombinedVariable) {
            if ($event.secondary)
                this.combinedVariable2 = variable;
            else this.combinedVariable1 = variable;
        }

        if (this.activeSafeguardPanel === SGT.Comparative && this.variable1 && this.variable2) {
            let value1 = (this.vis.renderer as HorizontalBarsRenderer).getDatum(this.variable1)
            let value2 = (this.vis.renderer as HorizontalBarsRenderer).getDatum(this.variable2)

            if (value1.ci3.center < value2.ci3.center)
                this.operator = Operators.LessThanOrEqualTo;
            else this.operator = Operators.GreaterThanOrEqualTo;

            this.variablePair = VariablePair.FromVariables(this.variable1, this.variable2);
        }

        if (this.activeSafeguardPanel === SGT.Comparative && this.combinedVariable1 && this.combinedVariable2) {
            let value1 = (this.vis.renderer as PunchcardRenderer).getDatum(this.combinedVariable1)
            let value2 = (this.vis.renderer as PunchcardRenderer).getDatum(this.combinedVariable2)

            if (value1.ci3.center < value2.ci3.center)
                this.operator = Operators.LessThanOrEqualTo;
            else this.operator = Operators.GreaterThanOrEqualTo;

            this.combinedVariablePair = CombinedVariablePair.FromVariables(this.combinedVariable1, this.combinedVariable2);
        }
    }

    constantSelected(constant: ConstantTrait) {
        if (constant instanceof PointValueConstant) {
            let value;
            this.pointValueConstant = constant;

            if (this.vis.renderer instanceof HorizontalBarsRenderer)
                value = this.vis.renderer.getDatum(this.variable1)
            else if (this.vis.renderer instanceof PunchcardRenderer)
                value = this.vis.renderer.getDatum(this.combinedVariable1);

            if (constant.value >= value.ci3.center)
                this.operator = Operators.LessThanOrEqualTo;
            else
                this.operator = Operators.GreaterThanOrEqualTo;
        }
        else if (constant instanceof PointRankConstant) {
            this.pointRankConstant = constant;
            // if (constant.rank >= value)
            this.operator = Operators.LessThanOrEqualTo;
            // else
            //     this.operator = Operators.GreaterThanOrEqualTo;
        }
        else if (constant instanceof RangeValueConstant)
            this.rangeValueConstant = constant;
        else if (constant instanceof RangeRankConstant)
            this.rangeRankConstant = constant;
        else if (constant instanceof PowerLawConstant)
            this.powerLawConstant = constant;
        else if (constant instanceof NormalConstant)
            this.normalConstant = constant;
        else if (constant instanceof LinearRegressionConstant)
            this.linearRegressionConstant = constant;
        else
            throw new Error(`Unknown Constant Type ${constant}`);
    }

    numBinsChanged() {
        let prev = this.activeSafeguardPanel;
        this.toggle(SGT.None);
        this.toggle(prev);
    }

    sgPanelRequested(sgt: SafeguardTypes) {
        this.toggle(sgt);
    }

    dataViewerRequested(d: Datum) {
        console.log(this.activeQuery)
        let predicate = this.activeQuery.getPredicateFromDatum(d);
        let where = this.activeQuery.where.and(predicate);
        this.filteredRows = this.engine.select(where);

        this.modalService
        .open(this.dataViewerModal, { size: 'lg', windowClass: 'modal-xxl' })
    }

    // query remove
    queryRemoveClicked(query: Query, confirm, reject, $event: UIEvent) {
        let sg = this.safeguards.find(sg => sg.query === query);

        if(sg) {
            this.modalService
                .open(reject)
        }
        else {
            this.modalService
                .open(confirm).result
                .then(() => {
                    this.engine.remove(query);
                    if(this.engine.ongoingQueries.length > 0) {
                        this.querySelected(this.engine.ongoingQueries[0]);
                    }
                    else if(this.engine.completedQueries.length > 0) {
                        this.querySelected(this.engine.completedQueries[0]);
                    }
                }, () => {
                });
        }

        $event.stopPropagation();
        return false;
    }

    // safeguard remove
    sgRemoveClicked(sg: Safeguard)
    {
        util.aremove(this.safeguards, sg);
        util.aremove(sg.query.safeguards, sg);
    }

    sgMouseEnter(sg: Safeguard) {
        this.highlightedQuery = sg.query;
    }

    sgMouseLeave(sg: Safeguard) {
        this.highlightedQuery = null;
    }

    sgClick(sg: Safeguard) {
        if(this.activeQuery != sg.query) this.querySelected(sg.query);
    }

    roundRobin = false;

    roundRobinChange() {
        let scheduler;
        if(this.roundRobin) scheduler = new RoundRobinScheduler(this.engine.ongoingQueries);
        else scheduler = new QueryOrderScheduler(this.engine.ongoingQueries);

        this.engine.reschedule(scheduler);
    }
}
