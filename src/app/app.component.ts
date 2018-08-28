import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Dataset } from './data/dataset';
import { FieldTrait, VlType, FieldGroupedValueList } from './data/field';
import { Engine, Priority } from './data/engine';

import { Query, EmptyQuery } from './data/query';
import { AccumulatedResponseDictionary } from './data/accumulator';
import { MetadataEditorComponent } from './metadata-editor/metadata-editor.component';
import { ExplorationNode, NodeState } from './exploration/exploration-node';
import { ExplorationLayout } from './exploration/exploration-layout';
import { ExplorationViewComponent } from './exploration/exploration-view.component';
import { FieldSelectorComponent } from './field-selector/field-selector.component';
import * as util from './util';
import { SpeechRecognitionService } from './speech-recognition.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Safeguard, SafeguardTypes } from './safeguard/safeguard';
import { VisConstants } from './vis/vis-constants';
import { VisComponent } from './vis/vis.component';
import { Operators } from './safeguard/operator';
import { VariableTrait, DoubleValueVariable, SingleVariable } from './safeguard/variable';
import { Constant } from './safeguard/constant';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';

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

    NodeState = NodeState;
    VC = VisConstants;
    EstimatePoint = Safeguard.EstimatePoint;
    CompareMeans = Safeguard.CompareMeans;
    SGT = SafeguardTypes;

    constructor(private cd: ChangeDetectorRef,
        private speech: SpeechRecognitionService,
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

    print(result: AccumulatedResponseDictionary) {
        for (const key in result) {
            const res = result[key];

            console.log(res.fieldGroupedValueList, res.accumulatedValue);
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
                    const [node, query] = this.fieldSelected(this.explorationRoot, field,
                        Priority.Lowest);
                }
            });

            this.run(67);

            this.nodeSelected(this.ongoingNodes[0]);

            of(0).pipe(
                delay(1000)
            ).subscribe(() => {
                this.vis.setCreationMode(this.activeSafeguardPanel);
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

    nodeSelected(node: ExplorationNode) {
        if (this.activeNode === node)
            this.activeNode = null;
        else this.activeNode = node;
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

    voiceSearchClicked() {
        this.speech.start(this.dataset.fields!.map(f => f.name), this.voiceKeywordRecognized.bind(this))
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
            .then((result) => {
                this.engine.remove(node.query);
                this.updateNodeLists();
            }, (reason) => {
                // console.log(`Dismissed`);
            });
    }

    activeSafeguardPanel = SafeguardTypes.None;
    safeguards: Safeguard[] = [];

    variable: SingleVariable;
    variable2: SingleVariable;
    useRank = false;
    variableSelected($event:{variable: SingleVariable, secondary?: boolean}) {
        if($event.secondary)
            this.variable2 = $event.variable;
        else
            this.variable = $event.variable;
    }

    pointConstant:number = 10;
    rangeConstant:[number, number] = [0, 10];

    constantSelected(constant: Constant) {
        if(typeof constant === 'number')
            this.pointConstant = constant;
        else
            this.rangeConstant = constant;
    }

    highlighted = 0;
    highlight(highlighted: number) {
        this.highlighted = highlighted;
        this.vis.highlight(highlighted);
    }

    useRankToggled() {
    }

    constantUserChanged(constant: Constant) {
        this.vis.constantUserChanged(constant);
    }

    Operators = Operators;
    operator = Operators.LessThan;
    PointOperators = [Operators.LessThan, Operators.LessThanOrEqualTo,
        Operators.GreaterThanOrEqualTo, Operators.GreaterThan];
    ComparativeOperators = [Operators.LessThan, Operators.LessThanOrEqualTo,
        Operators.GreaterThanOrEqualTo, Operators.GreaterThan];

    createPointSafeguard() {
        if(!this.variable) return;

        this.variable.rank = this.useRank;
        let sg = new Safeguard(this.variable, this.operator, this.pointConstant, this.activeNode);

        this.safeguards.push(sg);

        this.variable = null;
        this.pointConstant = 0;
    }

    createComparativeSafeguard() {
        if(!this.variable) return;
        if(!this.variable2) return;

        let sg = new Safeguard(
            new DoubleValueVariable(this.variable as SingleVariable,
                this.variable2 as SingleVariable),
            this.operator, this.pointConstant, this.activeNode);
        this.safeguards.push(sg);

        this.variable = null;
        this.variable2 = null;
    }

    cancelSafeguard() {
        this.activeSafeguardPanel = SafeguardTypes.None;
        this.vis.setCreationMode(SafeguardTypes.None);
    }

    toggle(panel:SafeguardTypes) {
        this.variable = null;
        this.variable2 = null;
        this.pointConstant = null;

        if(this.activeSafeguardPanel === panel) {
            this.cancelSafeguard();
        }
        else {
            this.activeSafeguardPanel = panel;
            this.vis.setCreationMode(panel);
        }
    }

    checkOrder() {
        if(this.rangeConstant[0] > this.rangeConstant[1]) {
            let temp = this.rangeConstant[0];
            this.rangeConstant[0] = this.rangeConstant[1];
            this.rangeConstant[1] = temp;
        }
    }
}
