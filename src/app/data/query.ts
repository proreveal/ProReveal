import { Dataset } from './dataset';
import { FieldTrait, VlType, QuantitativeField, FieldGroupedValueList, FieldGroupedValue } from './field';
import { assert, assertIn } from './assert';
import { AccumulatorTrait, CountAccumulator, AllAccumulator, AccumulatedValue, PartialValue } from './accum';
import { Sampler, UniformRandomSampler } from './sampler';
import { AggregateJob } from './job';
import { GroupBy } from './groupby';
import { Job } from './job';
import { ServerError } from './exception';
import { Progress } from './progress';
import { NumericalOrdering, OrderingDirection } from './ordering';
import { ConfidenceInterval, ApproximatorTrait, CountApproximator, MeanApproximator, EmptyConfidenceInterval } from './approx';
import { AccumulatedKeyValues, PartialKeyValue } from './keyvalue';
import { AndPredicate, EqualPredicate, RangePredicate, Predicate } from './predicate';
import { Datum } from './datum';
import { NullGroupId } from './grouper';
import { isArray } from 'util';
import * as d3 from 'd3';
import { Safeguard } from '../safeguard/safeguard';

export enum QueryState {
    Running = "Running",
    Paused = "Paused"
};

export abstract class Query {
    id: number;
    static Id = 1;
    visibleProgress: Progress = new Progress();
    recentProgress: Progress = new Progress();

    name: string;

    recentResult: AccumulatedKeyValues = {};
    visibleResult: AccumulatedKeyValues = {};
    visibleData: Datum[];

    lastUpdated: number = +new Date(); // epoch
    ordering = NumericalOrdering;
    orderingAttributeGetter = d => d;
    orderingDirection = OrderingDirection.Descending;
    updateAutomatically: boolean;
    createdAt: Date;

    domainStart = Number.MAX_VALUE;
    domainEnd = -Number.MAX_VALUE;
    maxUncertainty = 0;

    state: QueryState = QueryState.Running;

    constructor(public dataset: Dataset, public sampler: Sampler) {
        this.id = Query.Id++;
        this.createdAt = new Date();
    }

    abstract accumulate(job: Job, partialKeyValues: PartialKeyValue[]);
    abstract combine(field: FieldTrait): Query;
    abstract compatible(fields: FieldTrait[]): FieldTrait[];
    abstract desc(): string;
    abstract jobs(): Job[];

    pause() {
        this.state = QueryState.Paused;
    }

    run() {
        this.state = QueryState.Running;
    }
}

/**
 * represent an aggregate query such as min(age) by occupation
 * one quantitative, multiple categoricals
 */
export class AggregateQuery extends Query {
    name = "AggregateQuery";
    ordering = NumericalOrdering;
    orderingAttributeGetter = (d: Datum) => (d.ci3 as ConfidenceInterval).center;
    updateAutomatically = true;
    rankAvailable = true;
    hasAggregateFunction = true;

    safeguards: Safeguard[] = []; // underlying safeguards

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
        public where: AndPredicate,
        public sampler: Sampler = new UniformRandomSampler(100)
    ) {
        super(dataset, sampler);

        // create samples
        let samples = this.sampler.sample(this.dataset.rows.length);

        this.recentProgress.totalBlocks = samples.length;
        this.recentProgress.totalRows = dataset.length;
    }

    get fields() {
        let fields = [];
        if (this.target) fields.push(this.target);
        if (this.groupBy) {
            fields = fields.concat(this.groupBy.fields);
        }
        return fields;
    }

    jobs() {
        let samples = this.sampler.sample(this.dataset.rows.length);
        return samples.map((sample, i) =>
            new AggregateJob(
                this.accumulator,
                this.target,
                this.dataset,
                this.groupBy,
                this.where,
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
                this.where,
                this.sampler
            );
        }

        return new AggregateQuery(
            this.accumulator,
            this.approximator,
            this.target,
            this.dataset,
            new GroupBy(this.groupBy.fields.concat(field)),
            this.where,
            this.sampler
        );
    }

    compatible(fields: FieldTrait[]) {
        let compatibleTypes: VlType[] = [];
        if (this.target == null && this.groupBy.fields.length == 1) compatibleTypes.push(VlType.Quantitative, VlType.Dozen, VlType.Nominal, VlType.Ordinal);

        return fields.filter(field => compatibleTypes.includes(field.vlType))
    }

    desc() {
        let desc = `${this.accumulator.name}(${this.target ? this.target.name : '*'}) `;

        if (this.groupBy.fields.length > 0) {
            desc += 'group by ' + this.groupBy.fields.map(f => f.name).join(', ');
        }

        return desc;
    }

    getRecentData(): Datum[] {
        let data = Object.keys(this.recentResult).map(k => {
            let key = this.recentResult[k].key;
            let value = this.recentResult[k].value;

            const ai = this.approximator
                .approximate(value,
                    this.recentProgress.processedPercent(),
                    this.recentProgress.processedRows,
                    this.recentProgress.totalRows);

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

        if (this instanceof Histogram1DQuery) {
            let field = this.groupBy.fields[0] as QuantitativeField;
            let allGroupIds = field.grouper.getGroupIds();
            let groupIds = data.map(d => d.keys.list[0].groupId);

            let nonexist = allGroupIds.filter(id => !groupIds.includes(id));

            nonexist.forEach(id => {
                let key = new FieldGroupedValueList([
                    new FieldGroupedValue(field, id)
                ]);

                data.push(new Datum(
                    key.hash,
                    key,
                    EmptyConfidenceInterval,
                    this.accumulator.initAccumulatedValue
                ));
            })

            data = this.aggregate(data);
        }

        data.sort(this.ordering(this.orderingAttributeGetter, this.orderingDirection));

        this.visibleData = data;

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

    getPredicateFromDatum(d: Datum): Predicate {
        throw new Error('not implemented!')
    }
}

export class EmptyQuery extends AggregateQuery {
    name = "EmptyQuery";
    hasAggregateFunction = false;

    constructor(public dataset: Dataset, public sampler: Sampler = new UniformRandomSampler(100)) {
        super(null, null, null, dataset, null, null, sampler);
    }

    accumulate(job: Job, partialResponses: PartialKeyValue[]) {
        this.lastUpdated = +new Date();
    }

    combine(field: FieldTrait) {
        if (field.vlType === VlType.Quantitative) {
            return new Histogram1DQuery(field as QuantitativeField, this.dataset, new AndPredicate([]), this.sampler);
        }
        else if ([VlType.Ordinal, VlType.Nominal, VlType.Dozen].includes(field.vlType)) {
            return new Frequency1DQuery(field, this.dataset, new AndPredicate([]), this.sampler);
        }

        throw new ServerError("EmptyQuery + [Q, O, N, D]");
    }

    compatible(fields: FieldTrait[]) {
        return fields.filter(field => field.vlType !== VlType.Key);
    }

    desc() {
        return this.name;
    }

    jobs() {
        return [];
    }
}


/**
 * one quantitative
 */
export class Histogram1DQuery extends AggregateQuery {
    name = "Histogram1DQuery";
    ordering = NumericalOrdering;
    orderingDirection = OrderingDirection.Ascending;
    orderingAttributeGetter = (d: Datum) => isArray(d.keys.list[0].groupId) ?
        d.keys.list[0].groupId[0] : d.keys.list[0].groupId;
    rankAvailable = false;
    hasAggregateFunction = false;

    aggregationLevel = 2;
    minLevel = 1;
    maxLevel = 16;

    constructor(public grouping: QuantitativeField,
        public dataset: Dataset,
        public where: AndPredicate,
        public sampler: Sampler = new UniformRandomSampler(100)) {
        super(
            new CountAccumulator(),
            new CountApproximator(),
            null,
            dataset,
            new GroupBy([grouping]),
            where,
            sampler);

        assert(grouping.vlType, VlType.Quantitative);
    }

    combine(field: FieldTrait) {
        if (field.vlType === VlType.Quantitative)
            return new Histogram2DQuery(
                this.grouping,
                field as QuantitativeField,
                this.dataset,
                this.where,
                this.sampler);

        return new AggregateQuery(
            new AllAccumulator(),
            new MeanApproximator(),
            this.grouping,
            this.dataset,
            new GroupBy([field]),
            this.where,
            this.sampler);
    }

    aggregate(data: Datum[]) {
        const level = this.aggregationLevel;

        // level = 4
        // [-4 ... -1], [0 ... 3], [4 ... 7]

        let aggregated: { [id: number]: AccumulatedValue } = {};
        let result: Datum[] = [];

        data.forEach(d => {
            let id = d.keys.list[0].groupId;
            if (id === NullGroupId) {
                result.push(d);
                return;
            }

            let binId = Math.floor(<number>id / level);

            if (!(binId in aggregated))
                aggregated[binId] = this.accumulator.initAccumulatedValue;

            aggregated[binId] = this.accumulator.accumulate(aggregated[binId], d.accumulatedValue.toPartial());
        })

        d3.keys(aggregated).forEach(id => {
            const nid = +id;
            let value = aggregated[id];
            let key = new FieldGroupedValueList([
                new FieldGroupedValue(this.grouping, [
                    nid * level,
                    (nid + 1) * level - 1])
            ]);

            result.push(new Datum(
                key.hash,
                key,
                this.approximator.approximate(
                    value,
                    this.visibleProgress.processedPercent(),
                    this.visibleProgress.processedRows,
                    this.visibleProgress.totalRows
                ).range(3),
                value
            ))
        })

        return result;
    }

    getPredicateFromDatum(d: Datum) {
        let field = this.groupBy.fields[0];
        let range: [number, number] = d.keys.list[0].value() as [number, number];
        let includeEnd = range[1] == (field as QuantitativeField).grouper.max;

        return new RangePredicate(field, range[0], range[1], includeEnd);
    }
}

/**
 * one quantitative
 */
export class Histogram2DQuery extends AggregateQuery {
    name = "Histogram2DQuery";
    ordering = NumericalOrdering;
    orderingDirection = OrderingDirection.Ascending;
    orderingAttributeGetter = (d: Datum) => isArray(d.keys.list[0].groupId) ?
        d.keys.list[0].groupId[0] : d.keys.list[0].groupId;
    rankAvailable = false;
    hasAggregateFunction = false;

    constructor(
        public grouping1: QuantitativeField,
        public grouping2: QuantitativeField,
        public dataset: Dataset,
        public where: AndPredicate,
        public sampler: Sampler = new UniformRandomSampler(100)) {
        super(
            new AllAccumulator(),
            new CountApproximator(),
            null,
            dataset,
            new GroupBy([grouping1, grouping2]),
            where,
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
    orderingAttributeGetter = (d: Datum) => d.ci3.center;
    rankAvailable = true;
    hasAggregateFunction = false;

    constructor(public grouping: FieldTrait,
        public dataset: Dataset,
        public where: AndPredicate,
        public sampler: Sampler = new UniformRandomSampler(100)) {
        super(
            new CountAccumulator(),
            new CountApproximator(),
            null,
            dataset,
            new GroupBy([grouping]),
            where,
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
                this.where,
                this.sampler);
        }

        return new Frequency2DQuery(
            this.grouping,
            field,
            this.dataset,
            this.where,
            this.sampler);
    }

    getPredicateFromDatum(d: Datum) {
        let field = this.groupBy.fields[0];
        return new EqualPredicate(field, d.keys.list[0].value());
    }
}

export class Frequency2DQuery extends AggregateQuery {
    name = "Frequency2DQuery";
    ordering = NumericalOrdering;
    orderingAttributeGetter = (d: Datum) => (d.ci3 as ConfidenceInterval).center;
    rankAvailable = false;
    hasAggregateFunction = false;

    constructor(
        public grouping1: FieldTrait,
        public grouping2: FieldTrait,
        public dataset: Dataset,
        public where: AndPredicate,
        public sampler: Sampler = new UniformRandomSampler(100)) {

        super(
            new AllAccumulator(),
            new CountApproximator(),
            null,
            dataset,
            new GroupBy([grouping1, grouping2]),
            where,
            sampler);

        assertIn(grouping1.vlType, [VlType.Dozen, VlType.Nominal, VlType.Ordinal]);
        assertIn(grouping2.vlType, [VlType.Dozen, VlType.Nominal, VlType.Ordinal]);
    }

    combine(field: FieldTrait): AggregateQuery {
        throw new Error(`${this.name} cannot be combined`);
    }

    compatible(fields: FieldTrait[]) {
        return [];
    }
}




