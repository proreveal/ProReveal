import { Dataset } from './dataset';
import { FieldTrait, VlType } from './field';
import { assert, assertIn } from './assert';
import { AccumulatedResponseDictionary, AccumulatorTrait, PartialResponse, SumAccumulator, CountAccumulator, AccumulatedResponse } from './accumulator';
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
    name: string;
    result: AccumulatedResponseDictionary;

    constructor(public dataset: Dataset, public sampler: Sampler) {
        this.id = Query.Id++;
    }

    resultList() {
        return Object.keys(this.result).map(key =>
            [this.result[key].fieldGroupedValueList, this.result[key].accumulatedValue]
        );
        // TODO ordering
    }

    abstract jobs(): Job[];
    abstract accumulate(job: Job, partialResponses: PartialResponse[]);
    abstract combine(field: FieldTrait): Query;
    abstract compatible(fields: FieldTrait[]): FieldTrait[];
    abstract desc(): string;
}

/**
 * Represent an empty query (a query placeholder for the root node)
 */
export class EmptyQuery extends Query {
    name = "EmptyQuery";

    constructor(public dataset: Dataset, public sampler: Sampler = new UniformRandomSampler(100)) {
        super(dataset, sampler);
    }

    jobs() {
        return [];
    }

    accumulate(job: Job, partialResponses: PartialResponse[]) {

    }

    combine(field: FieldTrait) {
        if (field.vlType === VlType.Quantitative) {
            return new Histogram1DQuery(field, this.dataset, this.sampler);
        }
        else if ([VlType.Ordinal, VlType.Nominal, VlType.Dozen].includes(field.vlType)) {
            return new Frequency1DQuery(field, this.dataset, this.sampler);
        }

        throw new ServerError("EmptyQuery + [Q, O, N, D]");
    }

    compatible(fields: FieldTrait[]) {
        return fields.filter(field => field.vlType !== VlType.Key);
    }

    desc() {
        return this.name;
    }
}

/**
 * represent an aggregate query such as min(age) by occupation
 * one quantitative, multiple categoricals
 */
export class AggregateQuery extends Query {
    name = "AggregateQuery";
    result: AccumulatedResponseDictionary = {};

    /**
     *
     * @param accumulator
     * @param target can be null only when accumulator = Count
     * @param dataset
     * @param groupBy
     * @param sampler
     */
    constructor(
        public accumulator: AccumulatorTrait,
        public target: FieldTrait,
        public dataset: Dataset,
        public groupBy: GroupBy,
        public sampler: Sampler = new UniformRandomSampler(100)
    ) {
        super(dataset, sampler);
    }

    jobs() {
        // create samples
        let samples = this.sampler.sample(this.dataset.rows.length);

        this.progress.total = samples.length;

        return samples.map((sample, i) =>
            new AggregateJob(
                this.accumulator,
                this.target,
                this.dataset,
                this.groupBy,
                this,
                i,
                sample));
    }

    accumulate(job: Job, partialResponses: PartialResponse[]) {
        this.progress.processed++;

        partialResponses.forEach(pres => {
            const hash = pres.fieldGroupedValueList.hash;

            if (!this.result[hash])
                this.result[hash] = {
                    fieldGroupedValueList: pres.fieldGroupedValueList,
                    accumulatedValue: this.accumulator.initAccumulatedValue
                };

            this.result[hash].accumulatedValue =
                this.accumulator.accumulate(this.result[hash].accumulatedValue, pres.partialValue);
        });
    }

    combine(field: FieldTrait) {
        return new AggregateQuery(
            this.accumulator,
            this.target,
            this.dataset,
            this.groupBy,
            this.sampler
        );

        // return new ServerError("aggregateQuery cannot be combined at this moment");
    }

    compatible(fields: FieldTrait[]) {
        return fields.filter(field => field.vlType !== VlType.Key);
    }

    desc() {
        let desc = `${this.accumulator.name}(${this.target ? this.target.name : '*'}) `;

        if(this.groupBy.fields.length > 0) {
            desc += 'group by ' + this.groupBy.fields.map(f => f.name).join(', ');
        }

        return desc;
    }
}

/**
 * one quantitative
 */
export class Histogram1DQuery extends AggregateQuery {
    name = "Histogram1DQuery";

    constructor(public grouping: FieldTrait, public dataset: Dataset, public sampler: Sampler = new UniformRandomSampler(100)) {
        super(
            new CountAccumulator(),
            null,
            dataset,
            new GroupBy([grouping]),
            sampler);

        assert(grouping.vlType, VlType.Quantitative);
    }

    combine(field: FieldTrait) {
        if ([VlType.Dozen, VlType.Nominal, VlType.Ordinal].includes(field.vlType)) {
            return new AggregateQuery(
                new SumAccumulator(),
                this.grouping,
                this.dataset,
                new GroupBy([field]),
                this.sampler);
        }

        throw new ServerError("Histogram1DQuery + [O, N, D]");
    }
}

/**
 * one categorical
 */
export class Frequency1DQuery extends AggregateQuery {
    name = "Frequency1DQuery";

    constructor(public grouping: FieldTrait, public dataset: Dataset, public sampler: Sampler = new UniformRandomSampler(100)) {
        super(
            new CountAccumulator(),
            null,
            dataset,
            new GroupBy([grouping]),
            sampler);

        assertIn(grouping.vlType, [VlType.Dozen, VlType.Nominal, VlType.Ordinal]);
    }

    combine(field: FieldTrait) {
        if (field.vlType === VlType.Quantitative) {
            return new AggregateQuery(new SumAccumulator(),
                field,
                this.dataset,
                new GroupBy([this.grouping]),
                this.sampler);
        }

        throw new ServerError("Frequency1DQuery + [Q]")
    }
}



