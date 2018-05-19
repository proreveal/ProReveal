import * as util from '../util';

export interface Sampler {
    sample(n: number): number[][];
}

export class UniformRandomSampler implements Sampler {
    constructor(public sampleSize: number) {

    }

    sample(n: number) {
        let indices = util.shuffle(util.arange(n));
        let m = Math.ceil(n / this.sampleSize);

        let samples = [];

        while (indices.length > 0)
            samples.push(indices.splice(0, this.sampleSize));

        return samples;
    }
}

