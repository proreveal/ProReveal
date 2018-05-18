import { Dataset, FieldTrait, VlType } from '../dataset';
import { assert, assertIn } from './assert';
import { AccumulatedResponseDictionary, AccumulatorTrait, PartialResponse } from './accumulator';
import { Sampler, UniformRandomSampler } from './sampler';
import { AggregateJob } from './job';
import { GroupBy } from './groupby';
import { Queue } from './queue';
import { Job } from './job';

export class Progress {
    processed:number = 0; // # of processed blocks
    ongoing:number = 0; // # of ongoing blocks
    total:number = 0; // # of total blocks

    processedPercent() {
        if(this.total === 0) return 0;
        return this.processed / this.total;
    }

    ongoingPercent() {
        if(this.total === 0) return 0;
        return this.ongoing / this.total;
    }
}

export abstract class Query {
    id: number;
    static Id = 1;
    progress:Progress = new Progress();

    constructor(public dataset: Dataset) {
        this.id = Query.Id++;
    }

    abstract jobs():Job[];
    abstract accumulate(partialResponses:PartialResponse[]);
}

/**
 * represent an aggregate query such as min(age) by occupation
 */
export class AggregateQuery extends Query {
    result: AccumulatedResponseDictionary = {};

    constructor(public target: FieldTrait,
        public accumulator: AccumulatorTrait,
        public groupBy: GroupBy,
        public dataset: Dataset,
        public sampler: Sampler = new UniformRandomSampler(100)
    ) {
        super(dataset);

        // target should be quantitative
        assert(target.vlType, VlType.Quantitative);

        // groupBy should be nominal, ordinal, or dozens
        // this is checked in the constructor of GroupBy
    }

    jobs() {
        // create samples
        let samples = this.sampler.sample(this.dataset.rows.length);

        return samples.map((sample, i) => new AggregateJob(this, i, sample))
    }

    accumulate(partialResponses:PartialResponse[]) {
        partialResponses.forEach(pres => {
            const hash = pres.fieldValueList.hash;

            if(!this.result[hash])
                this.result[hash] = {
                    fieldValueList: pres.fieldValueList,
                    accumulatedValue: this.accumulator.initAccumulatedValue
                };

            this.result[hash].accumulatedValue =
                this.accumulator.accumulate(this.result[hash].accumulatedValue, pres.partialValue);
        });
    }
}

export class EmptyQuery extends Query {
    constructor() {
        super(null);
    }

    jobs() {
        return [];
    }

    accumulate(partialResponses:PartialResponse[]) {

    }
}
