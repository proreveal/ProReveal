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
import { VariablePair, SingleVariable, CombinedVariable, VariableTrait, CombinedVariablePair } from './safeguard/variable';
import { ConstantTrait, RankConstant, ValueConstant, RangeConstant, RangeRankConstant, PowerLawConstant, NormalConstant, LinearRegressionConstant } from './safeguard/constant';
import { BarsRenderer } from './vis/renderers/bars';
import { ValueEstimator, ComparativeEstimator, RangeEstimator, RankEstimator, PowerLawEstimator, NormalEstimator, LinearRegressionEstimator, MinMaxValueEstimator, MinMaxRankValueEstimator, MinMaxComparativeEstimator, MinMaxRangeEstimator } from './safeguard/estimate';
import { HeatmapRenderer } from './vis/renderers/heatmap';
import { isNull } from 'util';
import { Constants as C } from './constants';
import { AndPredicate, EqualPredicate } from './data/predicate';
import { RoundRobinScheduler, QueryOrderScheduler } from './data/scheduler';
import { Datum } from './data/datum';
import { LoggerService, LogType } from './services/logger.service';
import { ActivatedRoute } from "@angular/router";
import { ExpConstants } from './exp-constants';
import { FieldGroupedValue } from './data/field-grouped-value';
import { timer } from 'rxjs';
import { QueryCreatorComponent } from './query-creator/query-creator.component';
import { MaxApproximator } from './data/approx';
import * as io from 'socket.io-client';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
    SGT = SGT;
    QS = QueryState;
    C = C;
    Operators = Operators;
    Priority = Priority;
    ValueEstimate = new ValueEstimator().estimate;
    MinMaxValueEstimate = new MinMaxValueEstimator().estimate;
    RankEstimate = new RankEstimator().estimate;
    MinMaxRankEstimate = new MinMaxRankValueEstimator().estimate;
    RangeEstimate = new RangeEstimator().estimate;
    MinMaxRangeEstimate = new MinMaxRangeEstimator().estimate;
    ComparativeEstimate = new ComparativeEstimator().estimate;
    MinMaxComparativeEstimate = new MinMaxComparativeEstimator().estimate;
    PowerLawEstimate = new PowerLawEstimator().estimate;
    NormalEstimate = new NormalEstimator().estimate;
    LinearRegressionEstimate = new LinearRegressionEstimator().estimate;

    L = C.locale;

    @ViewChild('metadataEditor') metadataEditor: MetadataEditorComponent;
    @ViewChild('vis') vis: VisComponent;
    @ViewChild('queryCreator') queryCreator: QueryCreatorComponent;
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

    valueConstant: ValueConstant = new ValueConstant(0);
    rankConstant: RankConstant = new RankConstant(1);

    rangeConstant: RangeConstant = new RangeConstant(0.5, 0, 1);

    powerLawConstant: PowerLawConstant = new PowerLawConstant();
    normalConstant: NormalConstant = new NormalConstant();
    linearRegressionConstant: LinearRegressionConstant = new LinearRegressionConstant();

    dataViewerFilters: AndPredicate;
    filteredRows: any[] = [];

    alternate = false;

    operator = Operators.LessThanOrEqualTo;

    data: string;
    isStudying = false;

    isStudyMenuVisible = false;
    sampler = ExpConstants.sampler;
    testMenu = false;

    dataViewerQuery: AggregateQuery = null;
    dataViewerWhere: AndPredicate = null;

    fig: number;

    constructor(private route: ActivatedRoute, private modalService: NgbModal, public logger: LoggerService) {
        this.sortablejsOptions = {
            onUpdate: () => {
                this.engine.queue.reschedule();
            }
        };
    }

    ngOnInit() {
        /*let ws = io('ws://localhost:7999', {
            transports: ['websocket']
        })
        ws.on('connect', (msg: string) => {
            console.log(msg);
        })

        ws.on('welcome', () => {
            console.log('welcome from server')
        })
        */

        let parameters = util.parseQueryParameters(location.search);

        const data = parameters.data || "movies_en";
        const init = +parameters.init || 0;
        const run = +parameters.run || 0;
        const uid = parameters.uid || '0';
        const sid = parameters.sid || '0';
        const alternate = parameters.alternate || this.alternate;

        this.data = data;
        this.isStudying = parameters.study || 0;
        this.testMenu = parameters.test || 0;
        this.alternate = alternate;

        const tutorial = parameters.tutorial || 0;
        if (tutorial) this.alternate = true;

        this.engine = new Engine(`./assets/${data}.json`, `./assets/${data}.schema.json`);

        this.fig = +parameters.fig || 0;

        if (this.alternate)
            this.engine.reschedule(new RoundRobinScheduler(this.engine.ongoingQueries));

        this.engine.queryDone = this.queryDone.bind(this);

        this.engine.load().then(([dataset]) => {
            this.logger.setup(uid, sid);

            if (!this.isStudying) this.logger.mute();

            this.logger.log(LogType.AppStarted, { sid: sid, uid: uid });

            if (init) {
                dataset.fields
                    .sort((a, b) => {
                        if (a.order && b.order) return a.order - b.order;
                        if (a.order) return -1;
                        if (b.order) return 1;

                        if (a.vlType > b.vlType) return 1;
                        if (a.vlType < b.vlType) return -1;

                        if (a.name > b.name) return 1;
                        if (a.name < b.name) return -1;
                        return 0;
                    })
                    .forEach(field => {
                        if (field.vlType !== VlType.Key)
                            this.create(new EmptyQuery(dataset, this.sampler).combine(field));
                    });

                this.querySelected(this.engine.ongoingQueries[0]);

                if (run > 0) this.runMany(run);
            }

            if (tutorial) {
                this.create(new EmptyQuery(dataset, this.sampler).combine(dataset.getFieldByName('날씨')));
                this.create(new EmptyQuery(dataset, this.sampler).combine(dataset.getFieldByName('지역')));
                this.create(new EmptyQuery(dataset, this.sampler).combine(dataset.getFieldByName('최대 온도')).combine(dataset.getFieldByName('최소 온도')));
            }

            this.engine.run();

            if(data === 'movies_en') {
                this.create(new EmptyQuery(dataset, this.sampler).combine(dataset.getFieldByName('Genre')));
            }

            if(this.testMenu) {
                let q = new EmptyQuery(dataset, this.sampler).combine(dataset.getFieldByName('Votes')).combine(dataset.getFieldByName('Score'));
                // q.approximator = new MaxApproximator();
                this.create(q, Priority.Highest);
            }

            if (this.fig) this.setupFigures();
        })
    }

    createVisByNames(vis1: string, vis2: string = '', priority = Priority.Lowest, where: AndPredicate = null): AggregateQuery {
        let q: any = new EmptyQuery(this.engine.dataset, this.sampler);
        q = q.combine(this.engine.dataset.getFieldByName(vis1));
        if (vis2) {
            q = q.combine(this.engine.dataset.getFieldByName(vis2));
        }

        if (where)
            q.where = where;

        this.create(q, priority);

        return q;
    }


    createValueSafeguardFig(query: AggregateQuery, variable: SingleVariable, operator: Operators, constant: ValueConstant) {
        let sg = new ValueSafeguard(variable, operator, constant, query);
        this.safeguards.unshift(sg);
        query.safeguards.push(sg);
    }

    createRankSafeguardFig(query: AggregateQuery, variable: SingleVariable, operator: Operators, constant: RankConstant) {
        variable.isRank = true;

        let sg = new RankSafeguard(variable, operator, constant, query);
        this.safeguards.unshift(sg);
        query.safeguards.push(sg);
    }

    createComparativeSafeguardFig(query: AggregateQuery, variable: VariablePair, operator: Operators) {
        let sg = new ComparativeSafeguard(variable, operator, query);

        this.safeguards.unshift(sg);
        query.safeguards.push(sg);
    }


    createPowerLawSafeguardFig(query: AggregateQuery) {
        let sg = new PowerLawSafeguard(
            new PowerLawConstant(),
            query);

        this.safeguards.unshift(sg)
        this.activeQuery.safeguards.push(sg);
    }

    createLinearSafeguardFig(query: AggregateQuery) {
        let sg = new LinearSafeguard(new LinearRegressionConstant(1, 1), query);

        this.safeguards.unshift(sg)
        query.safeguards.push(sg);
    }

    cursorLeft: number;
    cursorTop: number;
    setupFigures() {
        let dataset = this.engine.dataset;

        if (this.fig === 1) {
            this.cursorLeft = 740;
            this.cursorTop = 250;

            let country = this.createVisByNames('Country');
            this.runMany(10);
            country.getVisibleData();
            this.runMany(90);
            this.createComparativeSafeguardFig(
                country,
                new VariablePair(
                    new SingleVariable(new FieldGroupedValue(
                        dataset.getFieldByName('Country'),
                        dataset.getFieldByName('Country').group('United States')
                    )),
                    new SingleVariable(new FieldGroupedValue(
                        dataset.getFieldByName('Country'),
                        dataset.getFieldByName('Country').group('United Kingdom')
                    )),
                ),
                Operators.GreaterThanOrEqualTo
            );
            this.createVisByNames('Runtime')
            this.runMany(100);
            this.createVisByNames('Year', 'Month');
            this.runMany(100);

            let month = this.createVisByNames('Month');
            this.createRankSafeguardFig(month,
                new SingleVariable(new FieldGroupedValue(
                    dataset.getFieldByName('Month'),
                    dataset.getFieldByName('Month').group('September')
                )),
                Operators.LessThanOrEqualTo,
                new RankConstant(1));

            this.runMany(45);
            let rs = this.createVisByNames('Budget', 'Revenue', Priority.Highest);
            this.createLinearSafeguardFig(rs);

            this.runMany(27);

            let genre = this.createVisByNames('Genre', '', Priority.Highest,
                new AndPredicate([
                    new EqualPredicate(dataset.getFieldByName('Month'), 'September')
                ]));
            this.runMany(14);

            this.engine.runningJob = genre.jobs()[0];

            timer(1000).subscribe(() => {
                this.toggle(SafeguardTypes.PowerLaw);
                this.vis.renderer.showTooltip(
                    (this.vis.renderer as BarsRenderer).getDatum(new SingleVariable(
                        new FieldGroupedValue(
                            dataset.getFieldByName('Genre'),
                            dataset.getFieldByName('Genre').group('Action')
                        )
                    )),
                    2
                );
            })
        }
        else if (this.fig === 3) {
            this.cursorLeft = 565;
            this.cursorTop = 222;
            this.createVisByNames('Year', 'Month');
            this.runMany(100);
            this.createVisByNames('Year', 'Month');
            this.runMany(100);
            this.createVisByNames('Year', 'Month');
            this.runMany(100);
            this.createVisByNames('Year', 'Month');
            this.runMany(100);
            this.createVisByNames('Year', 'Month');
            this.runMany(100);
            this.createVisByNames('Year', 'Month');
            this.runMany(100);
            this.createVisByNames('Year', 'Month');
            this.runMany(100);
            this.createVisByNames('Year', 'Month');
            this.runMany(100);

            let month = this.createVisByNames('Month');
            this.runMany(100);
            let rs = this.createVisByNames('Budget', 'Revenue', Priority.Highest);

            this.runMany(100);

            let genre = this.createVisByNames('Genre', '', Priority.Highest,
                new AndPredicate([
                    new EqualPredicate(dataset.getFieldByName('Month'), 'September')
                ]));
            this.createPowerLawSafeguardFig(genre);
            this.runMany(100);

            let pop = this.createVisByNames('Popularity', '', Priority.Highest);
            this.runMany(23);
            pop.getVisibleData();
            this.runMany(10)
            this.createValueSafeguardFig(pop, new SingleVariable(
                new FieldGroupedValue(
                    dataset.getFieldByName('Popularity'),
                    [2, 3]
                )), Operators.LessThanOrEqualTo,
                new ValueConstant(42));

            let heatmap = this.createVisByNames('Score', 'Votes', Priority.Highest);
            this.runMany(15);

            this.createVisByNames('Popularity', '', Priority.Highest)
            this.createVisByNames('Popularity', '', Priority.Highest)

            this.createVisByNames('Popularity', '', Priority.Highest)
            this.createVisByNames('Popularity', '', Priority.Highest)
            this.createVisByNames('Popularity', '', Priority.Highest)

            this.alternate = true;
            this.toggleQueryCreator();

            timer(1000).subscribe(() => {
                this.queryCreator.fieldSelected(dataset.getFieldByName('Genre'));
                this.queryCreator.fieldSelected(dataset.getFieldByName('Score'));

                this.querySelected(pop);

                timer(500).subscribe(() => {
                    this.querySelected(heatmap);
                    timer(500).subscribe(() => {
                        // this.toggle(SafeguardTypes.Range);
                        let datum = (this.vis.renderer as HeatmapRenderer).getDatum(
                            new CombinedVariable(
                                new SingleVariable(
                                    new FieldGroupedValue(
                                        dataset.getFieldByName('Score'),
                                        [4, 5]
                                    )
                                ),
                                new SingleVariable(
                                    new FieldGroupedValue(
                                        dataset.getFieldByName('Votes'),
                                        [0, 1]
                                    )
                                )
                            )
                        );
                        if(typeof (this.vis.renderer.eventBoxes as any)._groups[0][24].dispatchEvent == 'function') {
                            (this.vis.renderer.eventBoxes as any)._groups[0][24].dispatchEvent(new Event('click'))
                            //this.vis.renderer(this.vis.renderer.eventBoxes as any)._groups[0][24].dispatchEvent(new Event('mouseover'))
                        }
                        (this.vis.renderer as HeatmapRenderer).showTooltip(datum);

                    });
                });
            })
        }
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

        if (this.dataViewerQuery == query) {
            this.filteredRows = this.engine.select(
                this.dataViewerWhere, query.processedIndices);
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
        if (this.engine.autoRun && !this.engine.isRunning) this.engine.runOne();
        $event.stopPropagation();
        return false;
    }

    runAll() {
        this.queries.forEach(query => {
            query.run();
        });
        this.engine.reschedule();
        if (this.engine.autoRun && !this.engine.isRunning) this.engine.runOne();
    }

    pauseAll() {
        this.queries.forEach(query => {
            query.pause();
        });
        this.engine.reschedule();
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
            this.rangeConstant = new RangeConstant(0.5, 0, 1);
            this.powerLawConstant = new PowerLawConstant();
            this.normalConstant = new NormalConstant();


            if (DistributiveSafeguardTypes.includes(sgt)) {
                this.vis.renderer.setDefaultConstantFromVariable(true);
                this.vis.forceUpdate();
            }

            this.activeSafeguardPanel = sgt;
            this.vis.setSafeguardType(sgt);

            this.logger.log(LogType.SafeguardSelected, sgt);
        }
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
        this.creating = !this.creating

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
            let value1 = (this.vis.renderer as BarsRenderer).getDatum(this.variable1)
            let value2 = (this.vis.renderer as BarsRenderer).getDatum(this.variable2)

            if (value1.ci3.center < value2.ci3.center)
                this.operator = Operators.LessThanOrEqualTo;
            else this.operator = Operators.GreaterThanOrEqualTo;

            this.variablePair = VariablePair.FromVariables(this.variable1, this.variable2);
        }

        if (this.activeSafeguardPanel === SGT.Comparative && this.combinedVariable1 && this.combinedVariable2) {
            let value1 = (this.vis.renderer as HeatmapRenderer).getDatum(this.combinedVariable1)
            let value2 = (this.vis.renderer as HeatmapRenderer).getDatum(this.combinedVariable2)

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

            if (this.vis.renderer instanceof BarsRenderer)
                value = this.vis.renderer.getDatum(this.variable1)
            else if (this.vis.renderer instanceof HeatmapRenderer)
                value = this.vis.renderer.getDatum(this.combinedVariable1);

            if (constant.value >= value.ci3.center)
                this.operator = Operators.LessThanOrEqualTo;
            else
                this.operator = Operators.GreaterThanOrEqualTo;
        }
        else if (constant instanceof RankConstant) {
            this.rankConstant = constant;
            let value = (this.vis.renderer as BarsRenderer).getRank(this.variable1);

            if (constant.rank >= value)
                this.operator = Operators.LessThanOrEqualTo;
            else
                this.operator = Operators.GreaterThan;
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

        this.dataViewerQuery = this.activeQuery;
        this.dataViewerWhere = where;

        this.modalService
            .open(this.dataViewerModal, { size: 'lg', windowClass: 'modal-xxl' })
            .result
            .then(() => {
                this.dataViewerQuery = null;
                this.dataViewerWhere = null;
            }, () => {
                this.dataViewerQuery = null;
                this.dataViewerWhere = null;
            })
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
                    else {
                        this.activeQuery = null;
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
    alternateChange() {
        let scheduler;
        if (this.alternate) scheduler = new RoundRobinScheduler(this.engine.ongoingQueries);
        else scheduler = new QueryOrderScheduler(this.engine.ongoingQueries);

        this.logger.log(LogType.SchedulerChanged, scheduler.name);
        this.engine.reschedule(scheduler);
    }

    exportSafeguards() {
        let safeguards = this.safeguards.map(s => s.toLog());
        let safeguardsString = JSON.stringify(safeguards, null, 2);
        let dataString = `data:text/json;charset=utf-8,${encodeURIComponent(safeguardsString)}`;
        let anchor = document.createElement("a");
        anchor.setAttribute("href", dataString);
        anchor.setAttribute("download", `safeguards.json`);
        document.body.appendChild(anchor); // required for firefox
        anchor.click();
        anchor.remove();

        return false;
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

        if (this.vis && this.vis.renderer && this.vis.renderer.data) {
            data = this.vis.renderer.data.map(d => d.toLog());
        }

        this.logger.log(LogType.Done, {
            safeguards: this.safeguards.map(sg => sg.toLog()),
            data: data
        })
    }
}
