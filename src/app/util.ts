let ongoing:{[url: string]: [(value?:any) => void, (value?:any) => void][]} = {};

export function get(url: string, responseType?:string): Promise<any> {
    if(!ongoing[url]) {
        ongoing[url] = [];

        const request = new XMLHttpRequest();
        request.onload = function () {

            if (this.status === 200) {
                ongoing[url].forEach(f => {
                    f[0](this.response);
                })
            } else {
                ongoing[url].forEach(f => {
                    f[1](new Error(this.statusText));
                })
            }
            delete ongoing[url];
        };

        request.onerror = function () {
            ongoing[url].forEach(f => {
                f[1](new Error('XMLHttpRequest Error: ' + this.statusText));
            })
        };
        request.open('GET', url);
        if (responseType)
            request.responseType = <any>responseType;
        request.send();
    }

    return new Promise<any>(function (resolve, reject) {
        ongoing[url].push([resolve, reject]);
    });
}

export function arange(start:number, end?:number, step?:number): number[] {
    let n = start;
    if (end == undefined) {
        end = start;
        start = 0;
    }
    else
        n = end-start;
    if (step == undefined)
        step = 1;
    else
        n = n / step;

    n = Math.floor(n);
    let array = new Array(n);
    for (let i = 0; i < n; i++) {
        array[i] = start;
        start += step;
    }
    return array;
}
