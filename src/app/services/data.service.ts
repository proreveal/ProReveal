import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, filter } from 'rxjs/operators';


enum ServerType {
    Tiny,
    Remote
}


/**
 * Data Service Interface. It can connect to either a remote server (i.e., a python app)
 * or a client-side "tiny" server for testing and demonstration.
 */
@Injectable()
export class DataService {
    constructor(private serverType: ServerType, private http: HttpClient) {

    }

    // load() {
    //     return this.http.get('./assets/movies.json')
    // }

    // loadSampleRows() {
    //     return this.http
    //         .get('./assets/movies.json')
    //         .pipe(
    //             map(res => {
    //                 return res.filter(() => Math.random() < 0.1);
    //             })
    //         )
    // }
}
