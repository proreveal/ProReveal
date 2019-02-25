import { Component, OnInit, ViewChild, ElementRef, TemplateRef } from '@angular/core';
import { VlType } from './data/field';
import { Engine, Priority } from './data/engine';

import { Query, EmptyQuery, AggregateQuery, Histogram2DQuery, QueryState } from './data/query';
import { MetadataEditorComponent } from './metadata-editor/metadata-editor.component';
import * as util from './util';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Safeguard, SafeguardTypes as SGT, ValueSafeguard, RangeSafeguard, ComparativeSafeguard, SafeguardTypes, DistributiveSafeguard, DistributiveSafeguardTypes, NormalSafeguard, PowerLawSafeguard, LinearSafeguard, RankSafeguard } from './safeguard/safeguard';
import { VisComponent } from './vis/vis.component';
import { Operators } from './safeguard/operator';
import { VariablePair, SingleVariable, VariableTypes, CombinedVariable, VariableTrait, CombinedVariablePair } from './safeguard/variable';
import { ConstantTrait, RankConstant, ValueConstant, RangeConstant, RangeRankConstant, PowerLawConstant, NormalConstant, LinearRegressionConstant } from './safeguard/constant';
import { HorizontalBarsRenderer } from './vis/renderers/horizontal-bars';
import { ValueEstimator, ComparativeEstimator, RangeEstimator, RankEstimator, PowerLawEstimator, NormalEstimator, LinearRegressionEstimator, MinMaxValueEstimator, MinMaxRankValueEstimator } from './safeguard/estimate';
import { PunchcardRenderer } from './vis/renderers/punchcard';
import { isNull } from 'util';
import { Constants as C } from './constants';
import { AndPredicate, EqualPredicate } from './data/predicate';
import { RoundRobinScheduler, QueryOrderScheduler } from './data/scheduler';
import { Datum } from './data/datum';
import { LoggerService, LogType } from './logger.service';
import { ActivatedRoute } from "@angular/router";
import { ExpConstants } from './exp-constants';

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
    ValueEstimate = new ValueEstimator().estimate;
    MinMaxValueEstimate = new MinMaxValueEstimator().estimate;
    RankEstimate = new RankEstimator().estimate;
    MinMaxRankEstimate = new MinMaxRankValueEstimator().estimate;
    RangeEstimate = new RangeEstimator().estimate;
    ComparativeEstimate = new ComparativeEstimator().estimate;
    PowerLawEstimate = new PowerLawEstimator().estimate;
    NormalEstimate = new NormalEstimator().estimate;
    LinearRegressionEstimate = new LinearRegressionEstimator().estimate;

    L = C.locale;

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

    variable1: SingleVariable;
    variable2: SingleVariable;
    variablePair: VariablePair;
    combinedVariable1: CombinedVariable;
    combinedVariable2: CombinedVariable;
    combinedVariablePair: CombinedVariablePair;

    useLinear = false;
    useNormal = true;

    valueConstant: ValueConstant = new ValueConstant(0);
    rankConstant: RankConstant = new RankConstant(1);

    rangeConstant: RangeConstant = new RangeConstant(0, 1);

    powerLawConstant: PowerLawConstant = new PowerLawConstant();
    normalConstant: NormalConstant = new NormalConstant();
    linearRegressionConstant: LinearRegressionConstant = new LinearRegressionConstant();

    dataViewerFilters: AndPredicate;
    filteredRows: any[] = [];

    operator = Operators.LessThanOrEqualTo;

    data: string;
    isStudying = false;

    isStudyMenuVisible = false;
    sampler = ExpConstants.sampler;
    testMenu = false;
    markComplete = false;

    constructor(private route: ActivatedRoute, private modalService: NgbModal, public logger: LoggerService) {
        this.sortablejsOptions = {
            onUpdate: () => {
                this.engine.queue.reschedule();
            }
        };
    }

    ngOnInit() {
        let parameters = util.parseQueryParameters(location.search);

        const data = parameters.data || "birdstrikes";
        const init = parameters.init || 0;
        const uid = parameters.uid || '0';
        const sid = parameters.sid || '0';

        this.data = data;
        this.isStudying = parameters.study || 0;
        this.testMenu = parameters.test || 0;

        this.markComplete = parameters.complete || 0;

        this.engine = new Engine(`./assets/${data}.json`, `./assets/${data}.schema.json`);

        this.engine.queryDone = this.queryDone.bind(this);

        this.engine.load().then(([dataset]) => {
            this.logger.setup(uid, sid);

            if(!this.isStudying) this.logger.mute();

            this.logger.log(LogType.AppStarted, {sid: sid, uid: uid});

            if(init) {
                dataset.fields.forEach(field => {
                    if (field.vlType !== VlType.Key)
                        this.create(new EmptyQuery(dataset, this.sampler).combine(field));
                });

                this.querySelected(this.engine.ongoingQueries[5]);

                this.runMany(520);
            }

            if(this.isStudying)
                this.engine.run();
        })
    }

    testEqualWhere() {
        let whereField = this.engine.dataset.getFieldByName('Creative_Type');
        let where = new AndPredicate([new EqualPredicate(whereField, 'Contemporary Fiction')]);

        let visField = this.engine.dataset.getFieldByName('IMDB_Rating');

        let query = (new EmptyQuery(this.engine.dataset, this.sampler)).combine(visField);
        query.where = where;

        this.create(query, Priority.Highest);

        this.runMany(10);
    }

    testC() {
        this.runMany(5);
    }

    testN() {
        this.querySelected(this.engine.ongoingQueries[4]);
        this.runMany(145);
    }

    testCN() {
        let field1 = this.engine.dataset.getFieldByName('Creative_Type');
        let field2 = this.engine.dataset.getFieldByName('Production_Budget');

        let query = (new EmptyQuery(this.engine.dataset, this.sampler)).combine(field1).combine(field2);
        this.create(query, Priority.Highest);

        this.runMany(5);
    }

    testNN() {
        let field1 = this.engine.dataset.getFieldByName('Production_Budget');
        let field2 = this.engine.dataset.getFieldByName('IMDB_Rating');

        let query = (new EmptyQuery(this.engine.dataset, this.sampler)).combine(field1).combine(field2);
        this.create(query, Priority.Highest);

        this.runMany(10);
    }

    testCC() {
        let field1 = this.engine.dataset.getFieldByName('Creative_Type');
        let field2 = this.engine.dataset.getFieldByName('Major_Genre');

        let query = (new EmptyQuery(this.engine.dataset, this.sampler)).combine(field1).combine(field2);
        this.create(query, Priority.Highest)

        // this.runMany(10);
    }

    create(query: AggregateQuery, priority = Priority.Lowest) {
        this.logger.log(LogType.QueryCreated, query.toLog());

        this.queries.push(query);

        this.engine.request(query, priority);

        this.querySelected(query);

        this.creating = false;
    }

    toggleMetadataEditor() {
        this.metadataEditor.toggle();
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


        if (DistributiveSafeguardTypes.includes(this.activeSafeguardPanel)) {
            this.vis.renderer.setDefaultConstantFromVariable(true);
        }
    }

    querySelected(q: Query) {
        let query = q as AggregateQuery;

        this.logger.log(LogType.VisualizationSelected, query.toLog());

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
    }

    queryPauseClick(query: AggregateQuery, $event: UIEvent) {
        query.pause();
        this.engine.reschedule();
        $event.stopPropagation();
        return false;
    }

    queryRunClick(query: AggregateQuery, $event: UIEvent) {
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

    createValueSafeguard() {
        let variable = this.variable1 || this.combinedVariable1;
        if (!variable) return;

        let sg = new ValueSafeguard(variable, this.operator, this.valueConstant, this.activeQuery);

        this.logger.log(LogType.SafeguardCreated, sg.toLog());
        sg.history.push(sg.validity());
        this.safeguards.unshift(sg);
        this.activeQuery.safeguards.push(sg);

        this.variable1 = null;
        this.rankConstant = null;
        this.valueConstant = null;
        this.toggle(SGT.None);
    }

    createRankSafeguard() {
        let variable = this.variable1;
        if (!variable) return;

        variable.isRank = true;
        let sg = new RankSafeguard(variable, this.operator, this.rankConstant, this.activeQuery);

        this.logger.log(LogType.SafeguardCreated, sg.toLog());
        sg.history.push(sg.validity());
        this.safeguards.unshift(sg);
        this.activeQuery.safeguards.push(sg);

        this.variable1 = null;
        this.rankConstant = null;
        this.valueConstant = null;
        this.toggle(SGT.None);
    }

    createRangeSafeguard() {
        let variable = this.variable1 || this.combinedVariable1;
        if (!variable) return;

        let sg = new RangeSafeguard(variable, this.rangeConstant, this.activeQuery);

        this.logger.log(LogType.SafeguardCreated, sg.toLog());
        this.safeguards.unshift(sg);
        this.activeQuery.safeguards.push(sg);
        sg.history.push(sg.validity());

        this.variable1 = null;
        this.rangeConstant = null;
        this.toggle(SGT.None);
    }

    createComparativeSafeguard() {
        let variable = this.variablePair || this.combinedVariablePair;
        if (!variable) return;

        let sg = new ComparativeSafeguard(
            variable, this.operator, this.activeQuery);

        this.logger.log(LogType.SafeguardCreated, sg.toLog());
        sg.history.push(sg.validity());
        this.safeguards.unshift(sg);
        this.activeQuery.safeguards.push(sg);

        this.variable1 = null;
        this.variable2 = null;
        this.toggle(SGT.None);
    }

    createDistributiveSafeguard() {
        let sg: DistributiveSafeguard;
        if (this.activeSafeguardPanel === SGT.Normal)
            sg = new NormalSafeguard(this.normalConstant, this.activeQuery);
        else if (this.activeSafeguardPanel === SGT.PowerLaw)
            sg = new PowerLawSafeguard(this.powerLawConstant, this.activeQuery);
        else if (this.activeSafeguardPanel === SGT.Linear)
            sg = new LinearSafeguard(this.linearRegressionConstant, this.activeQuery);

        this.logger.log(LogType.SafeguardCreated, sg.toLog());
        sg.history.push(sg.validity());
        this.safeguards.unshift(sg)
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
            this.valueConstant = new ValueConstant(0);
            this.rankConstant = new RankConstant(1);
            this.rangeConstant = new RangeConstant(0, 1);
            this.powerLawConstant = new PowerLawConstant();
            this.normalConstant = new NormalConstant();

            this.useLinear = false;

            if (this.activeQuery instanceof Histogram2DQuery && DistributiveSafeguardTypes.includes(sgt)) {
                this.useLinear = true;
            }
            else if (DistributiveSafeguardTypes.includes(sgt)) {
                (this.vis.renderer as HorizontalBarsRenderer).setDefaultConstantFromVariable(true);
                this.vis.forceUpdate();
            }

            this.activeSafeguardPanel = sgt;
            this.vis.setSafeguardType(sgt);
            this.vis.setVariableType(sgt === SGT.Rank ? VariableTypes.Rank : VariableTypes.Value);

            this.logger.log(LogType.SafeguardSelected, sgt);
        }
    }

    useNormalToggled() {
        (this.vis.renderer as HorizontalBarsRenderer).setDefaultConstantFromVariable(true);
        this.vis.forceUpdate();
    }

    checkOrder() {
        this.rangeConstant.checkOrder();
    }

    toNumber(s: string) {
        let num = +s.replace(/,/g, '');
        if (isNaN(num)) num = 0;
        return num;
    }

    runMany(times: number) {
        for (let i = 0; i < times; i++)
            this.engine.runOne(true);
    }

    toggleQueryCreator() {
        this.creating=!this.creating

        this.logger.log(LogType.QueryCreatorOpened, this.creating);
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
        if (constant instanceof ValueConstant) {
            let value;
            this.valueConstant = constant;

            if (this.vis.renderer instanceof HorizontalBarsRenderer)
                value = this.vis.renderer.getDatum(this.variable1)
            else if (this.vis.renderer instanceof PunchcardRenderer)
                value = this.vis.renderer.getDatum(this.combinedVariable1);

            if (constant.value >= value.ci3.center)
                this.operator = Operators.LessThanOrEqualTo;
            else
                this.operator = Operators.GreaterThanOrEqualTo;
        }
        else if (constant instanceof RankConstant) {
            this.rankConstant = constant;
            // if (constant.rank >= value)
            this.operator = Operators.LessThanOrEqualTo;
            // else
            //     this.operator = Operators.GreaterThanOrEqualTo;
        }
        else if (constant instanceof RangeConstant)
            this.rangeConstant = constant;
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
        if (prev != SGT.None) {
            this.toggle(SGT.None);
            this.toggle(prev);
        }
    }

    sgPanelRequested(sgt: SafeguardTypes) {
        this.toggle(sgt);
    }

    dataViewerRequested(d: Datum) {
        let predicate = this.activeQuery.getPredicateFromDatum(d);
        let where = this.activeQuery.where.and(predicate);

        this.dataViewerFilters = where;
        this.filteredRows = this.engine.select(where, this.activeQuery.processedIndices);

        this.modalService
            .open(this.dataViewerModal, { size: 'lg', windowClass: 'modal-xxl' })
    }

    // query remove
    queryRemoveClicked(query: Query, confirm, reject, $event: UIEvent) {
        let sg = this.safeguards.find(sg => sg.query === query);

        if (sg) {
            this.modalService
                .open(reject)
        }
        else {
            this.modalService
                .open(confirm).result
                .then(() => {
                    this.engine.remove(query);
                    if (this.engine.ongoingQueries.length > 0) {
                        this.querySelected(this.engine.ongoingQueries[0]);
                    }
                    else if (this.engine.completedQueries.length > 0) {
                        this.querySelected(this.engine.completedQueries[0]);
                    }
                }, () => {
                });
        }

        $event.stopPropagation();
        return false;
    }

    // safeguard remove
    sgRemoveClicked(sg: Safeguard) {
        this.highlightedQuery = null;
        util.aremove(this.safeguards, sg);
        util.aremove(sg.query.safeguards, sg);
    }

    sgMouseEnter(sg: Safeguard) {
        this.highlightedQuery = sg.query;
    }

    sgMouseLeave() {
        this.highlightedQuery = null;
    }

    sgClick(sg: Safeguard) {
        if (this.activeQuery != sg.query) this.querySelected(sg.query);
    }

    // ongoing query list
    roundRobin = true;
    roundRobinChange() {
        let scheduler;
        if (this.roundRobin) scheduler = new RoundRobinScheduler(this.engine.ongoingQueries);
        else scheduler = new QueryOrderScheduler(this.engine.ongoingQueries);

        this.logger.log(LogType.SchedulerChanged, scheduler.name);
        this.engine.reschedule(scheduler);
    }

    // user study
    downloadCurrentUserLog() {
        let userLog = this.logger.userLog;
        let userLogString = JSON.stringify(userLog.toObject(), null, 2);
        let dataString = `data:text/json;charset=utf-8,${encodeURIComponent(userLogString)}`;
        let anchor = document.createElement("a");
        anchor.setAttribute("href", dataString);
        anchor.setAttribute("download", `${this.logger.uid}.json`);
        document.body.appendChild(anchor); // required for firefox
        anchor.click();
        anchor.remove();
    }

    printAllLogs() {
        console.log(this.logger.userLogs);
    }

    printCurrentUserLog() {
        console.log(this.logger.userLog);
    }

    printCurrentSessionLog() {
        console.log(this.logger.sessionLog);
    }

    removeAllLogs() {
        this.logger.clear();
    }

    unload() {
        let data: any;

        if(this.vis && this.vis.renderer && this.vis.renderer.data) {
            data = this.vis.renderer.data.map(d => d.toLog());
        }

        this.logger.log(LogType.Done, {
            safegaurds: this.safeguards.map(sg => sg.toLog()),
            data: data
        })
    }
}
