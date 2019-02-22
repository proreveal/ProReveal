import * as d3format from 'd3-format';

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

export function amax<T>(array: T[], mapper:(a:T) => number): [number, T, number] {
    let max = -Number.MAX_VALUE;
    let maxItem = null;
    let maxIndex = -1;

    array.forEach((d, i) => {
        let value = mapper(d);
        if(max < value) {
            max = value;
            maxItem = d;
            maxIndex = i;
        }
    })

    return [max, maxItem, maxIndex];
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

export function srange(n: number) {
    return arange(n).map(d => d.toString());
}

export function aremove(array: any[], item: any) {
    let index = array.indexOf(item);
    if(index >= 0)
        array.splice(index, 1);
}

export function toNumber(s: string) {
    let num = +s.replace(/,/g, '');
    if (isNaN(num)) num = 0;
    return num;
}

export function parseQueryParameters(queryString: string): any {
    let query = {};
    let pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
    for (let i = 0; i < pairs.length; i++) {
        let pair = pairs[i].split('=');
        query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
    }

    return query;
}

export function formatKRW(krw: number) {
    // we need to the first three digits

    if(krw < 1e5) return krw;

    let str = Math.round(krw).toString();
    let length = str.length;
    let result = "";
    let prevGroup4 = '';
    let numFlag = false;

    let splitter = '조억만';
    let signum = 0;

    for(let i = 0; i < splitter.length; i++) {
        let sc = (splitter.length - i + 1) * 4;

        let nums = str.substring(length - sc, length - sc + 4);

        if(nums) {
            result += nums + splitter[i];
            signum += nums.length;

            if(signum >= 3) break;
        }
    }

    // return result;

    // for(let i = 0; i < 3; i++) {
    //     let num = +str[i];
    //     let pos = length - i;
    //     let group4;

    //     console.log(str);
    //     if(pos >= 12) group4 = '조';
    //     else if(pos >= 8) group4 = '억';
    //     else if(pos >= 4) group4 = '만';

    //     if(num > 0) {
    //         numFlag = true;
    //         if(pos % 4 === 0) result += num;
    //         if(pos % 4 === 1) result += `${num}`
    //         if(pos % 4 === 2) result += `${num}`
    //         if(pos % 4 === 3) result += `${num}`
    //     }

    //     if(!prevGroup4) prevGroup4 = group4;
    //     if(prevGroup4 != group4 && result[result.length - 1]) {
    //         result += prevGroup4;
    //         numFlag = false;
    //     }
    //     prevGroup4 = group4;
    // }

    // if(numFlag) result += prevGroup4;

    return result;
}

/*
10,000 10K 만
1,000,000
5천2백만
5천2백5십만


10,000 만
100,000,000 억
1,000,000,000,000 조

5억2천3백만

천 백 십

만 억 조


*/

// console.log(formatKRW(12300000000)); // 123억
