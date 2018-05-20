/**
 * maps a string value to a number
 */
class StringScale {
    size = 0;
    dict = {};

    constructor() {

    }

    map(key:any) {
        if(!this.dict[key])
            this.dict[key] = this.size++;

        return this.dict[key];
    }
}

/**
 * maps a number to a bin number
 */
class HistogramScale {
    constructor(public min:number = Number.MAX_VALUE, public max:number = Number.MIN_VALUE) {

    }
}
