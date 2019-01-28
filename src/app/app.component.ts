import { Component, OnInit, ViewChild } from '@angular/core';
import { Dataset } from './data/dataset';
import { FieldTrait, VlType } from './data/field';
import { Engine, Priority } from './data/engine';

import { Query, EmptyQuery, AggregateQuery, Histogram1DQuery, Histogram2DQuery } from './data/query';
import { MetadataEditorComponent } from './metadata-editor/metadata-editor.component';
import { ExplorationNode, NodeState } from './exploration/exploration-node';
import * as util from './util';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Safeguard, SafeguardTypes as SGT, PointSafeguard, RangeSafeguard, ComparativeSafeguard, DistributiveSafeguard, SafeguardTypes } from './safeguard/safeguard';
import { VisConstants } from './vis/vis-constants';
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

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
    SGT = SGT;
    NodeState = NodeState;
    VC = VisConstants;
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

    dataset: Dataset;
    engine: Engine;

    activeNode: ExplorationNode = null;

    ongoingNodes: ExplorationNode[];
    completedNodes: ExplorationNode[];
    sortablejsOptions: any;
    highlightedNodes: ExplorationNode[] = [];

    activeSafeguardPanel = SGT.None;
    safeguards: Safeguard[] = [];
    isPlaying = false;

    creating = true;
    candidateFields: FieldTrait[] = [];
    selectableFields: FieldTrait[] = [];
    selectedFields: FieldTrait[] = [];
    newQuery: AggregateQuery;
    nodes: ExplorationNode[] = [];
    isDistributivePossible = true;

    constructor(private modalService: NgbModal) {
        this.sortablejsOptions = {
            onUpdate: this.ongoingQueriesReordered.bind(this)
        };
    }

    ongoingQueriesReordered() {
        // reflect the order of this.ongoingNodes to the engine
        let queries = this.ongoingNodes.map(node => node.query);
        this.engine.reorderOngoingQueries(queries);
    }

    fieldSelected(field: FieldTrait) {
        if (this.selectedFields.includes(field)) {
            util.aremove(this.selectedFields, field);
        }
        else {
            this.selectedFields.push(field);
        }

        let newQuery: Query = new EmptyQuery(this.dataset);
        this.selectedFields.forEach(field => {
            newQuery = newQuery.combine(field);
        })

        this.selectableFields = newQuery.compatible(this.candidateFields);
        if(this.selectedFields.length === 0) this.newQuery = null;
        else this.newQuery = newQuery as AggregateQuery;
    }

    create(fields: FieldTrait[], query: AggregateQuery, priority = Priority.Lowest) {
        let node = new ExplorationNode(fields, query);
        this.nodes.push(node);

        this.engine.request(query, priority);

        this.nodeSelected(node);

        this.updateNodeLists();
        this.cancelCreation();
    }

    cancelCreation() {
        this.selectedFields = [];
        this.selectableFields = this.candidateFields;
        this.creating = false;
    }

    ngOnInit() {
        this.engine = new Engine('./assets/movies.json');

        this.engine.queryDone = this.queryDone.bind(this);

        this.engine.load().then(dataset => {
            this.dataset = dataset;

            this.candidateFields = this.dataset.fields!
                .filter(field => field.vlType != VlType.Key)
                .sort((a, b) => {
                    if (a.vlType > b.vlType) return 1;
                    if (a.vlType < b.vlType) return -1;
                    if (a.name > b.name) return 1;
                    if (a.name < b.name) return -1;
                    return 0;
                })
            this.selectableFields = this.candidateFields;

            dataset.fields.forEach(field => {
                if (field.vlType !== VlType.Key) {
                    this.create([field], (new EmptyQuery(dataset)).combine(field));
                }
            });

            this.updateNodeLists();

            this.nodeSelected(this.ongoingNodes[1]);

            // Just run 10 jobs.
            this.run(40);

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

            // this.testCC();
            // this.testC();
            // this.testNN();

            //this.testNN();
            // this.run(1);
            // this.testNN();

            of(0).pipe(
                delay(1000)
            ).subscribe(() => {
                // this.toggle(SGT.Point);

                // this.useRank = true;
                // this.useRankToggled();
            })
        })

    }

    testC() {
        this.run(5);
    }

    testN() {
        this.nodeSelected(this.ongoingNodes[3]);
        this.run(105);
    }

    testCN() {
        let field1 = this.dataset.getFieldByName('Creative_Type');
        let field2 = this.dataset.getFieldByName('Production_Budget');

        let query = (new EmptyQuery(this.dataset)).combine(field1).combine(field2);
        this.create([field1, field2], query, Priority.Highest);

        this.run(5);
    }

    testNN() {
        let field1 = this.dataset.getFieldByName('Production_Budget');
        let field2 = this.dataset.getFieldByName('IMDB_Rating');

        let query = (new EmptyQuery(this.dataset)).combine(field1).combine(field2);
        this.create([field1, field2], query, Priority.Highest);

        this.run(10);
    }

    testCC() {
        let field1 = this.dataset.getFieldByName('Creative_Type');
        let field2 = this.dataset.getFieldByName('Major_Genre');

        let query = (new EmptyQuery(this.dataset)).combine(field1).combine(field2);
        this.create([field1, field2], query, Priority.Highest)

        this.run(10);
    }

    toggleMetadataEditor() {
        this.metadataEditor.toggle();
    }

    updateNodeLists() {
        this.ongoingNodes = this.engine.ongoingQueries.map(q => this.nodes.find(node => node.query === q));
        this.completedNodes = this.engine.completedQueries.map(q => this.nodes.find(node => node.query === q));
    }

    run(times: number, simulatedDelay = 0) {
        for (let i = 0; i < times; i++)
            this.engine.run(simulatedDelay);
    }

    queryDone(query: Query) {
        this.safeguards.forEach(sg => {
            if (sg.lastUpdated < sg.node.query.lastUpdated) {
                sg.lastUpdated = sg.node.query.lastUpdated;
                sg.lastUpdatedAt = new Date(sg.node.query.lastUpdated);

                sg.history.push(sg.validity());
            }

            if (sg instanceof DistributiveSafeguard && sg.node.query === query) {
                sg.updateConstant();
            }
        })

        if(this.activeSafeguardPanel === SGT.Distributive) {
            if(this.useLinear)
                (this.vis.renderer as PunchcardRenderer).setDefaultConstantFromVariable(true);
            else
                (this.vis.renderer as HorizontalBarsRenderer).setDefaultConstantFromVariable(true);
        }

        this.updateNodeLists();
    }

    rankAllowed() {
        return this.activeNode && this.activeNode.query
            && this.activeNode.query.rankAvailable;
    }

    nodeSelected(node: ExplorationNode) {
        if (this.activeNode === node)
            this.activeNode = null;
        else if (this.activeNode) {
            this.activeNode.query.updateAutomatically = true;
            this.activeNode = node;
            this.cancelSafeguard();
        }
        else {
            this.activeNode = node;
        }

        if (!this.rankAllowed()) this.useRank = false;
        if (this.activeNode) {
            this.useNormal = this.activeNode.query instanceof Histogram1DQuery;
            this.isDistributivePossible = !(this.activeNode.query.groupBy.fields.length == 2
                && this.activeNode.query.groupBy.fields[0].vlType != VlType.Quantitative);
        }
    }

    deleteClicked(modal, node: ExplorationNode) {
        this.modalService
            .open(modal, { ariaLabelledBy: 'modal-basic-title' }).result
            .then(() => {
                this.engine.remove(node.query);
                this.updateNodeLists();
            }, () => {
            });
    }

    variable1: SingleVariable;
    variable2: SingleVariable;
    variablePair: VariablePair;
    combinedVariable1: CombinedVariable;
    combinedVariable2: CombinedVariable;
    combinedVariablePair: CombinedVariablePair;
    useRank = false;
    useLinear = false;
    useNormal = true;

    pointValueConstant: PointValueConstant = new PointValueConstant(0);
    pointRankConstant: PointRankConstant = new PointRankConstant(1);

    rangeValueConstant: RangeValueConstant = new RangeValueConstant(0, 1);
    rangeRankConstant: RangeRankConstant = new RangeRankConstant(1, 2);

    powerLawConstant: PowerLawConstant = new PowerLawConstant();
    normalConstant: NormalConstant = new NormalConstant();
    linearRegressionConstant: LinearRegressionConstant = new LinearRegressionConstant();

    operator = Operators.LessThanOrEqualTo;

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

        if (this.useRank) sg = new PointSafeguard(variable, this.operator, this.pointRankConstant, this.activeNode);
        else sg = new PointSafeguard(variable, this.operator, this.pointValueConstant, this.activeNode);

        sg.history.push(sg.validity());
        this.safeguards.push(sg);

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
        if (this.useRank) sg = new RangeSafeguard(variable, this.rangeRankConstant, this.activeNode);
        else sg = new RangeSafeguard(variable, this.rangeValueConstant, this.activeNode);

        this.safeguards.push(sg);
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
            variable, this.operator, this.activeNode);
        sg.history.push(sg.validity());
        this.safeguards.push(sg);

        this.variable1 = null;
        this.variable2 = null;
        this.toggle(SGT.None);
    }

    createDistributiveSafeguard() {
        let sg: DistributiveSafeguard;
        if(!this.useLinear && this.useNormal)
            sg = new DistributiveSafeguard(this.normalConstant, this.activeNode);
        else if(!this.useLinear && this.useNormal)
            sg = new DistributiveSafeguard(this.powerLawConstant, this.activeNode);
        else if(this.useLinear)
            sg = new DistributiveSafeguard(this.linearRegressionConstant, this.activeNode);

        sg.history.push(sg.validity());
        this.safeguards.push(sg)

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
            if (isNull(this.activeNode)) return;
            // when opened, stop updating

            // this.activeNode.query.updateAutomatically = false;
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

            if (this.activeNode.query instanceof Histogram2DQuery && sgt === SafeguardTypes.Distributive) {
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

    sgRemoveClicked(sg: Safeguard)
    {
        util.aremove(this.safeguards, sg);
    }
}
