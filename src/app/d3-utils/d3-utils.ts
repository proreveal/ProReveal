function arange(start: number, end?: number, step?: number): number[] {
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

export function translate(x: number, y: number) {
    return `translate(${x}, ${y})`;
}

export function srange(n: number) {
    return arange(n).map(d => d.toString());
}

export function selectOrAppend(ele: d3.Selection<any, {}, null, undefined>,
    name: string,
    dotSplittedClassNames: string /*dd*/) {

    if(ele.select(dotSplittedClassNames).size() > 0) return ele.select(dotSplittedClassNames);
    return ele.append(name).attr('class', dotSplittedClassNames.replace(/\./g, ' '));
}
