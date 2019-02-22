import * as util from '../util';

export interface Sampler {
    sample(n: number): number[][];
}

export class UniformNumBlocksSampler implements Sampler {
    constructor(public numBlocks: number) {

    }

    sample(n: number) {
        let indices = util.arange(n);
        let m = Math.floor(n / this.numBlocks);

        let samples = [];
        let i = 0;
        while (indices.length > 0) {
            i++;
            samples.push(indices.splice(0, i >= this.numBlocks ? indices.length : m));
        }

        return samples;
    }
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

