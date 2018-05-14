import * as util from '../util';

export class TinyServer {
    rows: any[];

    constructor(private uri: string) {

    }

    load(): Promise<any[]> {
        if (this.rows)
            return Promise.resolve(this.rows);

        return util.get(this.uri, "json").catch(res => {
            this.rows = res;
            return res;
        })
    }

    sampleRows() {
        // return this.http
        //     .get('./assets/movies.json')
        //     .pipe(
        //         map(res => {
        //             return res.filter(() => Math.random() < 0.1);
        //         })
        //     )
    }
}
