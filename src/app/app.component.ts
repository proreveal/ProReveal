import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { Dataset } from './data/dataset';
import { FieldTrait, VlType } from './data/field';
import { Engine, Priority } from './data/engine';

import { Query, EmptyQuery, AggregateQuery } from './data/query';
import { MetadataEditorComponent } from './metadata-editor/metadata-editor.component';
import { ExplorationNode, NodeState } from './exploration/exploration-node';
import { ExplorationLayout } from './exploration/exploration-layout';
import { ExplorationViewComponent } from './exploration/exploration-view.component';
import { FieldSelectorComponent } from './field-selector/field-selector.component';
import * as util from './util';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Safeguard, SafeguardTypes as SGT, PointSafeguard, RangeSafeguard, ComparativeSafeguard, DistributiveSafeguard } from './safeguard/safeguard';
import { VisConstants } from './vis/vis-constants';
import { VisComponent } from './vis/vis.component';
import { Operators } from './safeguard/operator';
import { VariablePair, Variable, VariableTypes } from './safeguard/variable';
import { ConstantTrait, PointRankConstant, PointValueConstant, RangeValueConstant, RangeRankConstant, PowerLawConstant, NormalConstant, FittingTypes } from './safeguard/constant';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { HorizontalBarsRenderer } from './vis/renderers/horizontal-bars';
import { AccumulatedKeyValues } from './data/keyvalue';
import { PointValueEstimator, ComparativeEstimator, RangeValueEstimator, PointRankEstimator } from './safeguard/estimate';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
    @ViewChild('metadataEditor') metadataEditor: MetadataEditorComponent;
    @ViewChild('explorationView') explorationView: ExplorationViewComponent;
    @ViewChild('fieldSelector') fieldSelector: FieldSelectorComponent;
    @ViewChild('vis') vis: VisComponent;

    dataset: Dataset;
    explorationRoot: ExplorationNode;
    explorationLayout: ExplorationLayout = new ExplorationLayout();
    engine: Engine;

    activeNode: ExplorationNode = null;
    hoveredNode: ExplorationNode = null;

    ongoingNodes: ExplorationNode[];
    completedNodes: ExplorationNode[];
    sortablejsOptions: any;
    highlightedNodes: ExplorationNode[] = [];
    searchKeyword: string;

    SGT = SGT;
    NodeState = NodeState;
    VC = VisConstants;
    VT = VariableTypes;
    Operators = Operators;

    PointValueEstimate = new PointValueEstimator().estimate;
    PointRankEstimate = new PointRankEstimator().estimate;
    RangeValueEstimate = new RangeValueEstimator().estimate;
    ComparativeEstimate = new ComparativeEstimator().estimate;

    constructor(private cd: ChangeDetectorRef,
        private modalService: NgbModal) {
        this.sortablejsOptions = {
            onUpdate: this.ongoingQueriesReordered.bind(this)
        };
    }

    ongoingQueriesReordered() {
        // reflect the order of this.ongoingNodes to the engine
        let queries = this.ongoingNodes.map(node => node.query);
        this.engine.reorderOngoingQueries(queries);
    }

    fieldSelected(parent: ExplorationNode, field: FieldTrait, priority = Priority.AfterCompletedQueries): [ExplorationNode, Query] {
        // close the selector
        this.fieldSelector.hide();

        // if (this.previousNodeView) {
        //     this.previousNodeView.selectorClosed(); // important
        //     this.nodeUnselected(this.previousNodeView.node, this.previousNodeView, true);
        // }

        let query = parent.query.combine(field);
        let node = new ExplorationNode(parent, parent.fields.concat(field), query);

        parent.addChild(node);

        this.engine.request(query, priority);

        this.layout();
        this.activeNode = node;

        this.updateNodeLists();

        return [node, query];
    }

    collectNodes(node: ExplorationNode): ExplorationNode[] {
        if (node.hasChildren())
            return node.children.reduce((a, b) => a.concat(this.collectNodes(b)), node.isRoot() ? [] : [node]);
        return [node];
    }

    layout() {
        this.explorationLayout.layout(this.explorationRoot, false); //this.explorationView.editable);
    }

    print(result: AccumulatedKeyValues) {
        for (const key in result) {
            const res = result[key];

            console.log(res.key, res.value);
        }
    }

    ngOnInit() {
        this.engine = new Engine('./assets/movies.json');

        this.engine.load().then(dataset => {
            this.dataset = dataset;

            this.explorationRoot = new ExplorationNode(null, [], new EmptyQuery(dataset));
            this.layout();

            dataset.fields.forEach(field => {
                if (field.vlType !== VlType.Key) {
                    const [] = this.fieldSelected(this.explorationRoot, field,
                        Priority.Lowest);
                }
            });

            // Just run 10 jobs.

            // this.run(10);
            // of(0).pipe(
            //     delay(1000)
            // ).subscribe(() => {
            //     this.nodeSelected(this.ongoingNodes[0]);
            // });


            // Create sum(x) by y (no need for selecting one)
            const [node, query] = this.fieldSelected(this.ongoingNodes[0], dataset.getFieldByName('Production_Budget'));
            this.run(5);

            // normal (categorical)
            // this.nodeSelected(this.ongoingNodes[0]);

            // normal (numerical)
            // this.run(110);
            // this.nodeSelected(this.ongoingNodes[0]);

            // create two categorical

            // this.run(2);
            // this.fieldSelected(this.ongoingNodes[3], dataset.getFieldByName('Production_Budget'));
            // this.run(10);
            // const [] = this.fieldSelected(this.ongoingNodes[0], dataset.getFieldByName('Major_Genre'));
            // this.run(10);
            //this.nodeSelected(this.ongoingNodes[0]);


            of(0).pipe(
                delay(1000)
            ).subscribe(() => {
                this.vis.setSafeguardType(this.activeSafeguardPanel);
                this.vis.setVariableType(this.useRank ? VariableTypes.Rank : VariableTypes.Value);
            })
        })
    }

    toggleMetadataEditor() {
        this.metadataEditor.toggle();
    }

    // toggleEditable() {
    //     this.explorationView.toggleEditable();
    //     this.layout();
    // }

    updateNodeLists() {
        const nodes = this.collectNodes(this.explorationRoot);
        this.ongoingNodes = this.engine.ongoingQueries.map(q => nodes.find(node => node.query === q));
        this.completedNodes = this.engine.completedQueries.map(q => nodes.find(node => node.query === q));
    }

    run(times: number) {
        for (let i = 0; i < times; i++)
            this.engine.run();

        this.updateNodeLists();
    }

    // previousNodeView: ExplorationNodeViewComponent;

    // nodeSelected(node: ExplorationNode, nodeView: ExplorationNodeViewComponent, left: number, top: number, child: boolean) {
    //     if (child) {
    //         // show a field selector for the child
    //         if (this.previousNodeView) {
    //             this.previousNodeView.selectorClosed(); // important
    //             this.nodeUnselected(this.previousNodeView.node, this.previousNodeView, true);
    //         }
    //         this.fieldSelector.show(left + 70, top + 98, node.query.compatible(node.query.dataset.fields!), node);
    //         this.previousNodeView = nodeView;
    //     }
    //     else if (node != this.explorationRoot) {
    //         // show detail
    //         this.activeNode = node;
    //     }
    // }

    rankAllowed() {
        return this.activeNode && this.activeNode.query && (this.activeNode.query as AggregateQuery).groupBy.fields.length == 1;
    }

    nodeSelected(node: ExplorationNode) {
        if (this.activeNode === node)
            this.activeNode = null;
        else if (this.activeNode) {
            this.activeNode = node;
            this.cancelSafeguard();
        }
        else {
            this.activeNode = node;
        }

        if (!this.rankAllowed()) this.useRank = false;
    }

    // nodeUnselected(node: ExplorationNode, nodeView: ExplorationNodeViewComponent, child: boolean) {
    //     // this is definitely a child
    //     this.fieldSelector.hide();
    //     this.previousNodeView = null;
    // }

    wrapperClicked() {
        this.fieldSelector.hide();
        // if (this.previousNodeView) {
        //     this.previousNodeView.selectorClosed();
        //     this.nodeUnselected(this.previousNodeView.node, this.previousNodeView, true);
        // }
    }

    plusClicked($event: MouseEvent, node: ExplorationNode) {
        let target = util.getCurrentTarget($event) as HTMLButtonElement;
        let rect = target.getBoundingClientRect();
        let fields = node.query.dataset.fields!;
        fields = node.query.compatible(fields)
            .filter(field => !node.fields.includes(field));
        // compatible and no duplicates

        this.fieldSelector.show(rect.left + rect.width, rect.top + rect.height,
            fields, node);
        $event.stopPropagation();
    }

    keywordSearched(keyword: string) {
        if (keyword.length === 0) {
            this.highlightedNodes = [];
            return;
        }

        keyword = keyword.toLowerCase();

        this.highlightedNodes =
            this.completedNodes
                .filter(node => node.fields
                    .filter(field => field.name.toLowerCase().includes(keyword)
                    ).length > 0).concat(
                        this.ongoingNodes
                            .filter(node => node.fields
                                .filter(field => field.name.toLowerCase().includes(keyword))
                                .length > 0)
                    );
    }

    voiceKeywordRecognized(event) {
        if (event.results.length && event.results[0].length) {
            let candidate: string = event.results[0][0].transcript;

            this.searchKeyword = candidate;
            this.keywordSearched(candidate);

            this.cd.detectChanges();
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

    activeSafeguardPanel = SGT.Point;
    safeguards: Safeguard[] = [];

    variable1: Variable;
    variable2: Variable;
    variablePair: VariablePair;
    useRank = true;
    useGaussian = true;

    pointValueConstant: PointValueConstant = new PointValueConstant(0);
    pointRankConstant: PointRankConstant = new PointRankConstant(1);

    rangeValueConstant: RangeValueConstant = new RangeValueConstant(0, 1);
    rangeRankConstant: RangeRankConstant = new RangeRankConstant(1, 2);

    powerLawConstant: PowerLawConstant = new PowerLawConstant();
    gaussianConstant: NormalConstant = new NormalConstant(10);

    operator = Operators.LessThanOrEqualTo;

    variableSelected($event: { variable: Variable, secondary?: boolean }) {
        if ($event.secondary)
            this.variable2 = $event.variable;
        else
            this.variable1 = $event.variable;

        if (this.activeSafeguardPanel === SGT.Comparative && this.variable1 && this.variable2) {
            let value1 = (this.vis.renderer as HorizontalBarsRenderer).getDatum(this.variable1)
            let value2 = (this.vis.renderer as HorizontalBarsRenderer).getDatum(this.variable2)

            if (value1.ci3.center < value2.ci3.center)
                this.operator = Operators.LessThanOrEqualTo;
            else this.operator = Operators.GreaterThanOrEqualTo;

            this.variablePair = VariablePair.FromVariables(this.variable1, this.variable2);
        }
    }

    constantSelected(constant: ConstantTrait) {
        if (constant instanceof PointValueConstant) {
            let value = (this.vis.renderer as HorizontalBarsRenderer).getDatum(this.variable1)
            this.pointValueConstant = constant;
            if (constant.value >= value.ci3.center)
                this.operator = Operators.LessThanOrEqualTo;
            else
                this.operator = Operators.GreaterThanOrEqualTo;
        }
        else if (constant instanceof PointRankConstant) {
            let value = (this.vis.renderer as HorizontalBarsRenderer).getRank(this.variable1)
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
            this.gaussianConstant = constant;
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
        if (!this.variable1) return;

        this.variable1.isRank = this.useRank;
        let sg;
        if (this.useRank) sg = new PointSafeguard(this.variable1, this.operator, this.pointRankConstant, this.activeNode);
        else sg = new PointSafeguard(this.variable1, this.operator, this.pointValueConstant, this.activeNode);

        this.safeguards.push(sg);

        this.variable1 = null;
        this.pointRankConstant = null;
        this.pointValueConstant = null;
        this.toggle(SGT.None);
    }

    createRangeSafeguard() {
        if (!this.variable1) return;

        this.variable1.isRank = this.useRank;
        let sg;
        if (this.useRank) sg = new RangeSafeguard(this.variable1, this.rangeRankConstant, this.activeNode);
        else sg = new RangeSafeguard(this.variable1, this.rangeValueConstant, this.activeNode);

        this.safeguards.push(sg);

        this.variable1 = null;
        this.rangeRankConstant = null;
        this.rangeValueConstant = null;
        this.toggle(SGT.None);
    }

    createComparativeSafeguard() {
        if (!this.variable1) return;
        if (!this.variable2) return;

        let sg = new ComparativeSafeguard(
            VariablePair.FromVariables(this.variable1, this.variable2),
            this.operator, this.activeNode);
        this.safeguards.push(sg);

        this.variable1 = null;
        this.variable2 = null;
        this.toggle(SGT.None);
    }

    createDistributiveSafeguard() {
        let sg = new DistributiveSafeguard(this.powerLawConstant, this.activeNode);
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

        if (this.activeSafeguardPanel === sgt) {
            this.cancelSafeguard();
        }
        else {
            this.pointValueConstant = new PointValueConstant(0);
            this.pointRankConstant = new PointRankConstant(1);
            this.rangeValueConstant = new RangeValueConstant(0, 1);
            this.rangeRankConstant = new RangeRankConstant(1, 2);
            this.powerLawConstant = new PowerLawConstant();

            this.activeSafeguardPanel = sgt;
            this.vis.setSafeguardType(sgt);
            this.vis.setVariableType(this.useRank ? VariableTypes.Rank : VariableTypes.Value);
        }
    }

    useRankToggled() {
        this.vis.setVariableType(this.useRank ? VariableTypes.Rank : VariableTypes.Value);
    }

    useGaussianToggled() {
        this.vis.setFittingType(this.useGaussian ? FittingTypes.Normal : FittingTypes.PowerLaw);
    }

    checkOrder() {
        this.rangeValueConstant.checkOrder();
        this.rangeRankConstant.checkOrder();
    }

    fit() {
        (this.vis.renderer as HorizontalBarsRenderer).setDefaultConstantFromVariable(true);
    }

    toNumber(s: string) {
        let num = +s.replace(/,/g, '');
        if (isNaN(num)) num = 0;
        return num;
    }
}
