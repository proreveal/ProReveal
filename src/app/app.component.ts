import { Component, OnInit, ViewChild, ElementRef, Query } from '@angular/core';
import { Dataset } from './data/dataset';
import { FieldTrait } from './data/field';
import { Engine } from './data/engine';

import { AggregateQuery, EmptyQuery } from './data/query';
import { SumAccumulator } from './data/accumulator';
import { GroupBy } from './data/groupby';
import { MetadataEditorComponent } from './metadata-editor/metadata-editor.component';
import { ExplorationNode } from './exploration/exploration-node';
import { ExplorationLayout } from './exploration/exploration-layout';
import { ExplorationViewComponent } from './exploration/exploration-view.component';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
    title = 'app';
    @ViewChild('metadataEditor') metadataEditor: MetadataEditorComponent;
    @ViewChild('explorationView') explorationView: ExplorationViewComponent;

    dataset: Dataset;
    explorationRoot: ExplorationNode;
    explorationLayout: ExplorationLayout = new ExplorationLayout();

    constructor() {

    }

    fieldSelected(parent: ExplorationNode, field: FieldTrait) {
        let query = parent.query.combine(field);
        let node = new ExplorationNode(parent, query);

        parent.addChild(node);

        this.explorationView.closeSelector();
        this.layout();
    }

    layout() {
        this.explorationLayout.layout(this.explorationRoot);
    }

    ngOnInit() {
        const server = new Engine('./assets/movies.json');

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

        server.load().then(dataset => {
            this.dataset = dataset;

            // this.metadataEditor.open();
            // run test codes

            const rating = dataset.getFieldByName('Production_Budget');
            const genre = dataset.getFieldByName('Major_Genre');

            const query = new AggregateQuery(rating, new SumAccumulator(),
                new GroupBy([genre]), dataset);

            this.explorationRoot = new ExplorationNode(null, new EmptyQuery(dataset));
            this.layout();

            // server.request(query);

            // server.run();
            // console.log(JSON.stringify(query.result));

            // server.run();
            // console.log(JSON.stringify(query.result));

            // server.run();
            // console.log(JSON.stringify(query.result));
        })
    }
}
