import { Dataset } from './dataset';
import { FieldTrait, VlType, FieldGroupedValueList } from './field';
import { assert, assertIn } from './assert';
import { AccumulatorTrait, CountAccumulator, AccumulatedValue, AllAccumulator } from './accum';
import { Sampler, UniformRandomSampler } from './sampler';
import { AggregateJob } from './job';
import { GroupBy } from './groupby';
import { Job } from './job';
import { ServerError } from './exception';
import { Progress } from './progress';
import { NumericalOrdering, OrderingDirection } from './ordering';
import { ConfidenceInterval, ApproximatorTrait, CountApproximator, MeanApproximator } from './approx';
import { AccumulatedKeyValues, PartialKeyValue } from './keyvalue';
import { NullGroupId } from './grouper';

export class Datum {
    constructor(public id: string,
        public keys: FieldGroupedValueList,
        public ci3: ConfidenceInterval,
        public accumulatedValue: AccumulatedValue) {

        }

    keyHasNullValue() {
        return this.keys.list[0].groupId == NullGroupId;
    }
};

export abstract class Query {
    id: number;
    static Id = 1;
    visibleProgress: Progress = new Progress();
    recentProgress: Progress = new Progress();

    name: string;

    recentResult: AccumulatedKeyValues = {};
    visibleResult: AccumulatedKeyValues = {};

    lastUpdated: number = +new Date(); // epoch
    ordering = NumericalOrdering;
    orderingAttributeGetter = d => d;
    orderingDirection = OrderingDirection.Descending;
    jobs: Job[];
    updateAutomatically;
    createdAt: Date;

    constructor(public dataset: Dataset, public sampler: Sampler) {
        this.id = Query.Id++;
        this.jobs = [];
        this.createdAt = new Date();
    }

    abstract accumulate(job: Job, partialKeyValues: PartialKeyValue[]);
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

    accumulate(job: Job, partialResponses: PartialKeyValue[]) {
        this.lastUpdated = +new Date();
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
    ordering = NumericalOrdering;
    orderingAttributeGetter = (d:Datum) => (d.ci3 as ConfidenceInterval).center;
    updateAutomatically = true;

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
        public approximator: ApproximatorTrait,
        public target: FieldTrait,
        public dataset: Dataset,
        public groupBy: GroupBy,
        public sampler: Sampler = new UniformRandomSampler(100)
    ) {
        super(dataset, sampler);

        // create samples
        let samples = this.sampler.sample(this.dataset.rows.length);

        this.recentProgress.totalBlocks = samples.length;
        this.recentProgress.totalRows = dataset.length;

        this.jobs = samples.map((sample, i) =>
            new AggregateJob(
                this.accumulator,
                this.target,
                this.dataset,
                this.groupBy,
                this,
                i,
                sample));
    }

    accumulate(job: AggregateJob, partialKeyValues: PartialKeyValue[]) {
        this.lastUpdated = +new Date();

        this.recentProgress.processedRows += job.sample.length;
        this.recentProgress.processedBlocks++;

        partialKeyValues.forEach(pres => {
            const hash = pres.key.hash;

            if (!this.recentResult[hash])
                this.recentResult[hash] = {
                    key: pres.key,
                    value: this.accumulator.initAccumulatedValue
                };

            this.recentResult[hash].value =
                this.accumulator.accumulate(this.recentResult[hash].value, pres.value);
        });
    }

    combine(field: FieldTrait) {
        if (field.vlType === VlType.Quantitative && this.target === null) {
            return new AggregateQuery(
                new AllAccumulator(),
                new MeanApproximator(),
                field,
                this.dataset,
                this.groupBy,
                this.sampler
            );
        }

        return new AggregateQuery(
            this.accumulator,
            this.approximator,
            this.target,
            this.dataset,
            new GroupBy(this.groupBy.fields.concat(field)),
            this.sampler
        );
    }

    compatible(fields: FieldTrait[]) {
        let compatibleTypes: VlType[] = [];
        if(this.target == null && this.groupBy.fields.length == 1) compatibleTypes.push(VlType.Quantitative, VlType.Dozen, VlType.Nominal, VlType.Ordinal);

        return fields.filter(field => compatibleTypes.includes(field.vlType))
    }

    desc() {
        let desc = `${this.accumulator.name}(${this.target ? this.target.name : '*'}) `;

        if (this.groupBy.fields.length > 0) {
            desc += 'group by ' + this.groupBy.fields.map(f => f.name).join(', ');
        }

        return desc;
    }

    getVisibleData(): Datum[] {
        let data = Object.keys(this.visibleResult).map(k => {
            let key = this.visibleResult[k].key;
            let value = this.visibleResult[k].value;

            const ai = this.approximator
                .approximate(value,
                    this.visibleProgress.processedPercent(),
                    this.visibleProgress.processedRows,
                    this.visibleProgress.totalRows);

            return new Datum(
                key.hash,
                key,
                ai.range(3),
                value
            );
        })

        data.sort(this.ordering(this.orderingAttributeGetter, this.orderingDirection));

        return data;
    }

    getRecentData(): Datum[] {
        let data = Object.keys(this.recentResult).map(k => {
            let key = this.visibleResult[k].key;
            let value = this.visibleResult[k].value;

            const ai = this.approximator
                .approximate(value,
                    this.visibleProgress.processedPercent(),
                    this.visibleProgress.processedRows,
                    this.visibleProgress.totalRows);

            return new Datum(
                key.hash,
                key,
                ai.range(3),
                value
            );
        })

        data.sort(this.ordering(this.orderingAttributeGetter, this.orderingDirection));

        return data;
    }

    sync() {
        let clone: AccumulatedKeyValues = {};

        Object.keys(this.recentResult).forEach(key => {
            clone[key] = {
                key: this.recentResult[key].key,
                value: this.recentResult[key].value
            }
        })

        this.visibleResult = clone;
        this.visibleProgress = this.recentProgress.clone();
    }
}

/**
 * one quantitative
 */
export class Histogram1DQuery extends AggregateQuery {
    name = "Histogram1DQuery";
    ordering = NumericalOrdering;
    orderingDirection = OrderingDirection.Ascending;
    orderingAttributeGetter = (d: Datum) => d.keys.list[0].groupId;

    constructor(public grouping: FieldTrait, public dataset: Dataset, public sampler: Sampler = new UniformRandomSampler(100)) {
        super(
            new CountAccumulator(),
            new CountApproximator(),
            null,
            dataset,
            new GroupBy([grouping]),
            sampler);

        assert(grouping.vlType, VlType.Quantitative);
    }

    combine(field: FieldTrait) {
        if (field.vlType === VlType.Quantitative)
            return new Histogram2DQuery(
                this.grouping,
                field,
                this.dataset,
                this.sampler);

        return new AggregateQuery(
            new AllAccumulator(),
            new MeanApproximator(),
            this.grouping,
            this.dataset,
            new GroupBy([field]),
            this.sampler);
    }
}

/**
 * one quantitative
 */
export class Histogram2DQuery extends AggregateQuery {
    name = "Histogram2DQuery";
    ordering = NumericalOrdering;
    orderingDirection = OrderingDirection.Ascending;
    orderingAttributeGetter = (d: Datum) => d.keys.list[0].groupId;

    constructor(
        public grouping1: FieldTrait,
        public grouping2: FieldTrait,
        public dataset: Dataset,
        public sampler: Sampler = new UniformRandomSampler(100)) {
        super(
            new AllAccumulator(),
            new CountApproximator(),
            null,
            dataset,
            new GroupBy([grouping1, grouping2]),
            sampler);

        assert(grouping1.vlType, VlType.Quantitative);
        assert(grouping2.vlType, VlType.Quantitative);
    }

    combine(field: FieldTrait): AggregateQuery {
        throw new Error(`${this.name} cannot be combined`);
    }

    compatible(fields: FieldTrait[]) {
        return [];
    }
}

/**
 * one categorical
 */
export class Frequency1DQuery extends AggregateQuery {
    name = "Frequency1DQuery";
    ordering = NumericalOrdering;
    orderingAttributeGetter = (d:Datum) => d.ci3.center;

    constructor(public grouping: FieldTrait, public dataset: Dataset, public sampler: Sampler = new UniformRandomSampler(100)) {
        super(
            new CountAccumulator(),
            new CountApproximator(),
            null,
            dataset,
            new GroupBy([grouping]),
            sampler);

        assertIn(grouping.vlType, [VlType.Dozen, VlType.Nominal, VlType.Ordinal]);
    }

    combine(field: FieldTrait) {
        if (field.vlType === VlType.Quantitative) {
            return new AggregateQuery(
                new AllAccumulator(),
                new MeanApproximator(),
                field,
                this.dataset,
                new GroupBy([this.grouping]),
                this.sampler);
        }

        return new AggregateQuery(
            new CountAccumulator(),
            new CountApproximator(),
            null,
            this.dataset,
            new GroupBy([this.grouping, field]),
            this.sampler);
    }
}




