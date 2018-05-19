import { Dataset, FieldTrait, VlType } from './dataset';
import { assert, assertIn } from './assert';
import { AccumulatedResponseDictionary, AccumulatorTrait, PartialResponse, SumAccumulator } from './accumulator';
import { Sampler, UniformRandomSampler } from './sampler';
import { AggregateJob } from './job';
import { GroupBy } from './groupby';
import { Queue } from './queue';
import { Job } from './job';
import { ServerError } from './exception';

export class Progress {
    processed: number = 0; // # of processed blocks
    ongoing: number = 0; // # of ongoing blocks
    total: number = 0; // # of total blocks

    processedPercent() {
        if (this.total === 0) return 0;
        return this.processed / this.total;
    }

    ongoingPercent() {
        if (this.total === 0) return 0;
        return this.ongoing / this.total;
    }
}

export abstract class Query {
    id: number;
    static Id = 1;
    progress: Progress = new Progress();

    constructor(public dataset: Dataset, public sampler: Sampler) {
        this.id = Query.Id++;
    }

    abstract jobs(): Job[];
    abstract accumulate(partialResponses: PartialResponse[]);
    abstract combine(field: FieldTrait): Query;
}

/**
 * Represent an empty query (a query placeholder for the root node)
 */
export class EmptyQuery extends Query {
    constructor(public dataset: Dataset, public sampler: Sampler = new UniformRandomSampler(100)) {
        super(dataset, sampler);
    }

    jobs() {
        return [];
    }

    accumulate(partialResponses: PartialResponse[]) {

    }

    combine(field: FieldTrait) {
        if (field.vlType === VlType.Quantitative) {
            return new Histogram1DQuery(field, this.dataset, this.sampler);
        }
        else if (field.vlType in [VlType.Ordinal, VlType.Nominal, VlType.Dozen]) {
            return new Frequency1DQuery(field, this.dataset, this.sampler);
        }

        throw new ServerError("EmptyQuery + [Q, O, N, D]");
    }
}

/**
 * one quantitative
 */
export class Histogram1DQuery extends Query {
    constructor(public target: FieldTrait, public dataset: Dataset, public sampler: Sampler = new UniformRandomSampler(100)) {
        super(dataset, sampler);

        assert(target.vlType, VlType.Quantitative);
    }

    jobs() {
        return [];
    }

    accumulate() {

    }

    combine(field: FieldTrait) {
        if (field.vlType in [VlType.Dozen, VlType.Nominal, VlType.Ordinal]) {
            return new AggregateQuery(this.target, new SumAccumulator(),
                new GroupBy([field]), this.dataset, this.sampler);
        }

        throw new ServerError("Histogram1DQuery + [O, N, D]");
    }
}

/**
 * one categorical
 */
export class Frequency1DQuery extends Query {
    constructor(public target: FieldTrait, public dataset: Dataset, public sampler: Sampler = new UniformRandomSampler(100)) {
        super(dataset, sampler);

        assertIn(target.vlType, [VlType.Dozen, VlType.Nominal, VlType.Ordinal]);
    }

    jobs() {
        return [];
    }

    accumulate() {

    }

    combine(field: FieldTrait) {
        if (field.vlType === VlType.Quantitative) {
            // agregate
            return new AggregateQuery(field, new SumAccumulator(),
                new GroupBy([this.target]), this.dataset);
        }

        throw new ServerError("Frequency1DQuery + [Q]")
    }
}

/**
 * represent an aggregate query such as min(age) by occupation
 * one quantitative, multiple categoricals
 */
export class AggregateQuery extends Query {
    result: AccumulatedResponseDictionary = {};

    constructor(public target: FieldTrait,
        public accumulator: AccumulatorTrait,
        public groupBy: GroupBy,
        public dataset: Dataset,
        public sampler: Sampler = new UniformRandomSampler(100)
    ) {
        super(dataset, sampler);

        // target should be quantitative
        assert(target.vlType, VlType.Quantitative);

        // groupBy should be nominal, ordinal, or dozens
        // this is checked in the constructor of GroupBy
    }

    jobs() {
        // create samples
        let samples = this.sampler.sample(this.dataset.rows.length);

        return samples.map((sample, i) => new AggregateJob(this, i, sample));
    }

    accumulate(partialResponses: PartialResponse[]) {
        partialResponses.forEach(pres => {
            const hash = pres.fieldValueList.hash;

            if (!this.result[hash])
                this.result[hash] = {
                    fieldValueList: pres.fieldValueList,
                    accumulatedValue: this.accumulator.initAccumulatedValue
                };

            this.result[hash].accumulatedValue =
                this.accumulator.accumulate(this.result[hash].accumulatedValue, pres.partialValue);
        });
    }

    combine(field: FieldTrait) {
        return new EmptyQuery(this.dataset, this.sampler);

        // return new ServerError("aggregateQuery cannot be combined at this moment");
    }
}

