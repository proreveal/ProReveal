import { Component, OnInit } from '@angular/core';
import { Dataset } from './dataset';
import { TinyServer, AggregateQuery } from './tiny/tiny-server';

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

        })
    }
}
