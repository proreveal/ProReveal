import { Component, OnInit, ViewChild, ElementRef, Query } from '@angular/core';
import { Dataset } from './dataset';
import { TinyServer } from './tiny/tiny-server';

import { AggregateQuery, EmptyQuery } from './tiny/query';
import { SumAccumulator } from './tiny/accumulator';
import { GroupBy } from './tiny/groupby';
import { MetadataEditorComponent } from './metadata-editor/metadata-editor.component';
import { ExplorationNode } from './exploration/exploration-node';
import { ExplorationLayout } from './exploration/exploration-layout';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
    title = 'app';
    @ViewChild('metadataEditor') metadataEditor: MetadataEditorComponent;

    // public history:any = {
    //     isRoot:true,
    //     progress: 1,
    //     fields: [],
    //     children:[]
    //   };

    // focusedHistory:any = 'empty';
    // schemaLoaded:boolean = false;

    samples:Dataset;
    explorationRoot:ExplorationNode = new ExplorationNode(null, null);
    explorationLayout:ExplorationLayout = new ExplorationLayout();

    constructor() {

    }

    ngOnInit() {
        const server = new TinyServer('./assets/movies.json');

        let n1 = new ExplorationNode(this.explorationRoot, new EmptyQuery());
        this.explorationRoot.addChild(n1);


        let n2 = new ExplorationNode(this.explorationRoot, new EmptyQuery());
        this.explorationRoot.addChild(n2);

        n2.addChild(new ExplorationNode(n2, new EmptyQuery()));
        n2.addChild(new ExplorationNode(n2, new EmptyQuery()));


        let n3 = new ExplorationNode(this.explorationRoot, new EmptyQuery());
        this.explorationRoot.addChild(n3);

        // n3.addChild(new ExplorationNode(n3, new EmptyQuery()));
        // n3.addChild(new ExplorationNode(n3, new EmptyQuery()));

        this.explorationLayout.layout(this.explorationRoot);

        server.load().then(dataset => {
            this.samples = dataset;

            // this.metadataEditor.open();
            // run test codes

            const rating = dataset.getFieldByName('IMDB_Rating');
            const genre = dataset.getFieldByName('Major_Genre');

            const query = new AggregateQuery(rating, new SumAccumulator(),
                new GroupBy([genre]), dataset);


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
