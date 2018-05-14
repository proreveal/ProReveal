import { Component, OnInit } from '@angular/core';
import { TinyServer } from './tiny/tiny-server';
import { Dataset } from './dataset';

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
        let server = new TinyServer("./assets/movies.json");

        server.load().then(rows => {
            this.samples = new Dataset(rows);
            console.log(this.samples);
        })
    }
}
