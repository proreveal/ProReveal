import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Dataset } from './data/dataset';
import { FieldTrait } from './data/field';
import { Engine } from './data/engine';

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
import { normalcdf } from './data/cdf';

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

    constructor(private cd: ChangeDetectorRef) {

    }

    fieldSelected(parent: ExplorationNode, field: FieldTrait): [ExplorationNode, Query] {
        // close the selector
        if (this.previousNodeView) {
            this.previousNodeView.selectorClosed(); // important
            this.nodeUnselected(this.previousNodeView.node, this.previousNodeView, true);
        }

        let query = parent.query.combine(field);
        let node = new ExplorationNode(parent, query);

        parent.addChild(node);

        this.layout();

        this.engine.request(query);

        return [node, query];
    }


    layout() {
        this.explorationLayout.layout(this.explorationRoot, this.explorationView.editable);
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

            this.explorationRoot = new ExplorationNode(null, new EmptyQuery(dataset));
            this.layout();

            const genre = dataset.getFieldByName('Major_Genre');
            const [node1, query1] = this.fieldSelected(this.explorationRoot, genre);

            const rating = dataset.getFieldByName('Production_Budget');
            const [node2, query2] = this.fieldSelected(this.explorationRoot, rating);

            this.fieldSelected(node1, rating);

            // server.request(query);

            for(let i=0;i<10;i++) {
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

    run() {
        this.engine.run();
    }

    previousNodeView: ExplorationNodeViewComponent;

    nodeSelected(node: ExplorationNode, nodeView: ExplorationNodeViewComponent, left: number, top: number, child: boolean) {
        if (child) {
            // show a field selector for the child
            if (this.previousNodeView) {
                this.previousNodeView.selectorClosed(); // important
                this.nodeUnselected(this.previousNodeView.node, this.previousNodeView, true);
            }
            this.fieldSelector.show(left + 70, top + 98, node.query.compatible(node.query.dataset.fields!), node);
            this.previousNodeView = nodeView;
        }
        else if (node != this.explorationRoot) {
            // show detail
            this.activeNode = node;
        }
    }

    nodeUnselected(node: ExplorationNode, nodeView: ExplorationNodeViewComponent, child: boolean) {
        // this is definitely a child
        this.fieldSelector.hide();
        this.previousNodeView = null;
    }

    wrapperClicked() {
        if(this.previousNodeView) {
            this.previousNodeView.selectorClosed();
            this.nodeUnselected(this.previousNodeView.node, this.previousNodeView, true);
        }
    }
}
