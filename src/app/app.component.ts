import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Dataset } from './data/dataset';
import { FieldTrait, VlType } from './data/field';
import { Engine, Priority } from './data/engine';

import { Query, AggregateQuery, EmptyQuery } from './data/query';
import { SumAccumulator, AccumulatedResponseDictionary } from './data/accumulator';
import { GroupBy } from './data/groupby';
import { MetadataEditorComponent } from './metadata-editor/metadata-editor.component';
import { ExplorationNode } from './exploration/exploration-node';
import { ExplorationLayout } from './exploration/exploration-layout';
import { ExplorationViewComponent } from './exploration/exploration-view.component';
import { ExplorationNodeViewComponent } from './exploration/exploration-node-view.component';
import { FieldSelectorComponent } from './field-selector/field-selector.component';
import { Constants } from './constants';
import * as util from './util';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
    @ViewChild('metadataEditor') metadataEditor: MetadataEditorComponent;
    @ViewChild('explorationView') explorationView: ExplorationViewComponent;
    @ViewChild('fieldSelector') fieldSelector: FieldSelectorComponent

    dataset: Dataset;
    explorationRoot: ExplorationNode;
    explorationLayout: ExplorationLayout = new ExplorationLayout();
    engine: Engine;
    activeNode: ExplorationNode = null;
    nodes: ExplorationNode[];

    constructor(private cd: ChangeDetectorRef) {

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

        return [node, query];
    }

    collectNodes(node: ExplorationNode) {
        if (node.hasChildren())
            return node.children.reduce((a, b) => a.concat(this.collectNodes(b)), node.isRoot() ? [] : [node]);
        return [node];
    }

    layout() {
        this.explorationLayout.layout(this.explorationRoot, true); //this.explorationView.editable);

        this.nodes = this.collectNodes(this.explorationRoot);

        let order = {};

        this.engine.queries.forEach((q, i) => {
            order[q.id] = i;
        })

        this.nodes.sort((a, b) => order[a.query.id] - order[b.query.id]);
    }

    print(result: AccumulatedResponseDictionary) {
        for (const key in result) {
            const res = result[key];

            console.log(res.fieldGroupedValueList, res.accumulatedValue);
        }
    }

    ngOnInit() {
        this.engine = new Engine('./assets/movies.json');

        // let n1 = new ExplorationNode(this.explorationRoot, new EmptyQuery());
        // this.explorationRoot.addChild(n1);

        // let n2 = new ExplorationNode(this.explorationRoot, new EmptyQuery());
        // this.explorationRoot.addChild(n2);

        // n2.addChild(new ExplorationNode(n2, new EmptyQuery()));
        // n2.addChild(new ExplorationNode(n2, new EmptyQuery()));


        // let n3 = new ExplorationNode(this.explorationRoot, new EmptyQuery());
        // this.explorationRoot.addChild(n3);

        // n3.addChild(new ExplorationNode(n3, new EmptyQuery()));
        // n3.addChild(new ExplorationNode(n3, new EmptyQuery()));

        this.engine.load().then(dataset => {
            this.dataset = dataset;

            // this.metadataEditor.open();
            // run test codes


            // const query = new AggregateQuery(rating, new SumAccumulator(),
            //     new GroupBy([genre]), dataset);

            this.explorationRoot = new ExplorationNode(null, [], new EmptyQuery(dataset));
            this.layout();

            dataset.fields.forEach(field => {
                if (field.vlType !== VlType.Key) {
                    const [node, query] = this.fieldSelected(this.explorationRoot, field,
                        Priority.Lowest);
                }
            });

            // const genre = dataset.getFieldByName('Major_Genre');
            // const [node1, query1] = this.fieldSelected(this.explorationRoot, genre);

            // const rating = dataset.getFieldByName('Production_Budget');
            // const [node2, query2] = this.fieldSelected(this.explorationRoot, rating);

            // const source = dataset.getFieldByName('Source');
            // const [node3, query3] = this.fieldSelected(node1, source);
            // this.fieldSelected(node1, rating);

            // server.request(query);

            for (let i = 0; i < 80; i++) {
                this.engine.run();
            }
            // console.log(JSON.stringify(query.result));
        })
    }

    toggleMetadataEditor() {
        this.metadataEditor.toggle();
    }

    toggleEditable() {
        this.explorationView.toggleEditable();
        this.layout();
    }

    run(times: number) {
        for (let i = 0; i < times; i++)
            this.engine.run();
    }

    previousNodeView: ExplorationNodeViewComponent;

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
        this.activeNode = node;
    }

    nodeUnselected(node: ExplorationNode, nodeView: ExplorationNodeViewComponent, child: boolean) {
        // this is definitely a child
        this.fieldSelector.hide();
        this.previousNodeView = null;
    }

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
        this.fieldSelector.show(rect.left + rect.width, rect.top + rect.height,
            node.query.compatible(node.query.dataset.fields!), node);
        $event.stopPropagation();
    }
}
