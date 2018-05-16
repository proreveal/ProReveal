import { Component, OnInit } from '@angular/core';
import { Dataset } from './dataset';
import { TinyServer } from './tiny/tiny-server';

import { AggregateQuery } from './tiny/query';
import { SumAccumulator } from './tiny/accumulator';
import { GroupBy } from './tiny/groupby';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
    title = 'app';

    // public history:any = {
    //     isRoot:true,
    //     progress: 1,
    //     fields: [],
    //     children:[]
    //   };

    // focusedHistory:any = 'empty';
    // schemaLoaded:boolean = false;

    samples:Dataset;

    constructor() {

    }

    ngOnInit() {
        const server = new TinyServer('./assets/movies.json');

        server.load().then(dataset => {
            this.samples = dataset;

            // run test codes

            const rating = dataset.getFieldByName('IMDB_Rating');
            const genre = dataset.getFieldByName('Major_Genre');

            const query = new AggregateQuery(rating, new SumAccumulator(),
                new GroupBy([genre]), dataset);

            server.request(query);

            server.run();
            console.log(JSON.stringify(query.result));

            server.run();
            console.log(JSON.stringify(query.result));

            server.run();
            console.log(JSON.stringify(query.result));
        })
    }
}
