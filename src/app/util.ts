export function levenshtein(a: string, b: string): number {
    if (a.length == 0) return b.length;
    if (b.length == 0) return a.length;

    // swap to save some memory O(min(a,b)) instead of O(a)
    if (a.length > b.length) {
        let tmp = a;
        a = b;
        b = tmp;
    }

    let row = [];
    // init the row
    for (let i = 0; i <= a.length; i++) {
        row[i] = i;
    }

    // fill in the rest
    for (let i = 1; i <= b.length; i++) {
        let prev = i;
        for (let j = 1; j <= a.length; j++) {
            let val;
            if (b.charAt(i - 1) == a.charAt(j - 1)) {
                val = row[j - 1]; // match
            } else {
                val = Math.min(row[j - 1] + 1, // substitution
                    prev + 1,     // insertion
                    row[j] + 1);  // deletion
            }
            row[j - 1] = prev;
            prev = val;
        }
        row[a.length] = prev;
    }

    return row[a.length];
}

let ongoing: { [url: string]: [(value?: any) => void, (value?: any) => void][] } = {};

export function get(url: string, responseType?: string): Promise<any> {
    if (!ongoing[url]) {
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

export function arange(start: number, end?: number, step?: number): number[] {
    let n = start;
    if (end == undefined) {
        end = start;
        start = 0;
    }
    else
        n = end - start;
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

/**
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 */
export function shuffle(a: any[]) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

export function getCurrentTarget(e: any) {
    if (e.toElement) {
        return e.toElement;
    } else if (e.currentTarget) {
        return e.currentTarget;
    } else if (e.srcElement) {
        return e.srcElement;
    } else {
        return null;
    }
}
