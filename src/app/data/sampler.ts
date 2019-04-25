import * as util from '../util';

export interface Sampler {
    numRows: number;
    numBatches: number;

    sample(n: number): number[][];
}

export class UniformNumBlocksSampler implements Sampler {
    constructor(public numRows: number, public numBatches: number) {

    }

    sample() {
        let indices = util.arange(this.numRows);
        let m = Math.floor(this.numRows / this.numBatches);

        let samples = [];
        let i = 0;
        while (indices.length > 0) {
            i++;
            samples.push(indices.splice(0, i >= this.numBatches ? indices.length : m));
        }

        return samples;
    }
}

export class RemoteSampler implements Sampler {
    constructor(public numRows: number, public numBatches: number) {

    }

    sample(): number[][] {
        throw new Error('Cannot call the sample method of RemoteSampler');
    }
}
