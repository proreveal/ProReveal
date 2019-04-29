import { Dataset } from './dataset';
import { FieldTrait, VlType, QuantitativeField } from './field';
import { assert, assertIn } from './assert';
import { AccumulatorTrait, CountAccumulator, AllAccumulator, AccumulatedValue, PartialValue } from './accum';
import { Sampler } from './sampler';
import { AggregateJob } from './job';
import { GroupBy } from './groupby';
import { Job } from './job';
import { ServerError } from './exception';
import { Progress } from './progress';
import { NumericalOrdering, OrderingDirection } from './ordering';
import { ApproximatorTrait, CountApproximator, MeanApproximator } from './approx';
import { AccumulatedKeyValues, PartialKeyValue } from './keyvalue';
import { AndPredicate, EqualPredicate, RangePredicate, Predicate } from './predicate';
import { Datum } from './datum';
import { NullGroupId, GroupIdType } from './grouper';
import { isArray, isNull } from 'util';
import * as d3 from 'd3';
import { Safeguard } from '../safeguard/safeguard';
import { FieldGroupedValue } from './field-grouped-value';
import { FieldGroupedValueList } from './field-grouped-value-list';
import { ConfidenceInterval, EmptyConfidenceInterval } from './confidence-interval';

export enum QueryState {
    Running = 'Running',
    Paused = 'Paused'
};

export abstract class Query {
    id: string;
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
    processedIndices: number[] = [];

    constructor(public dataset: Dataset) {
        this.id = `ClientQuery${Query.Id++}`;
        this.createdAt = new Date();
    }

    abstract accumulate(partialKeyValues: PartialKeyValue[], processedRows: number): void;
    abstract combine(field: FieldTrait): Query;
    abstract compatible(fields: FieldTrait[]): FieldTrait[];
    abstract desc(): string;
    abstract jobs(): Job[];

    pause() {
        this.state = QueryState.Paused;
    }

    resume() {
        this.state = QueryState.Running;
    }

    abstract toJSON(): any;
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

    isRankAvailable = true;
    isPowerLawAvailable = false;
    isNormalAvailable = false;
    isLinearAvailable = false;

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
        public where: AndPredicate) {
        super(dataset);

        this.recentProgress.numBatches = dataset.sampler.numBatches;
        this.recentProgress.numRows = dataset.sampler.numRows;
    }

    toLog() {
        return {
            name: this.name,
            accumulator: this.accumulator.name,
            approximator: this.approximator.name,
            target: this.target ? this.target.name : null,
            groupBy: this.groupBy.fields.map(d => d.name),
            where: this.where.predicates.map(d => d.toLog())
        };
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
        let samples = this.dataset.sampler.sample(this.dataset.rows.length);

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

    accumulate(partialKeyValues: PartialKeyValue[], processedRows: number) {
        this.lastUpdated = +new Date();

        this.recentProgress.processedRows += processedRows;
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
                this.where
            );
        }

        return new AggregateQuery(
            this.accumulator,
            this.approximator,
            this.target,
            this.dataset,
            new GroupBy(this.groupBy.fields.concat(field)),
            this.where
        );
    }

    compatible(fields: FieldTrait[]) {
        let compatibleTypes: VlType[] = [];
        if (this.target == null && this.groupBy.fields.length == 1) compatibleTypes.push(VlType.Quantitative, VlType.Nominal, VlType.Ordinal);

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
                    this.recentProgress.numRows);

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
                    this.visibleProgress.numRows);

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
        else if (this instanceof Histogram2DQuery) {
            let fieldX = this.groupBy.fields[0] as QuantitativeField;
            let fieldY = this.groupBy.fields[1] as QuantitativeField;

            let exist = {};

            let xHasNull = false, yHasNull = false;

            data.forEach(d => {
                let xGroupId = d.keys.list[0].groupId as number;
                let yGroupId = d.keys.list[1].groupId as number;

                if(xGroupId === NullGroupId) xHasNull = true;
                if(yGroupId == NullGroupId) yHasNull = true;

                if (!exist[xGroupId]) exist[xGroupId] = {};
                exist[xGroupId][yGroupId] = true;
            })

            let allXIds = fieldX.grouper.getGroupIds();
            if(xHasNull) allXIds.push(NullGroupId);

            let allYIds = fieldY.grouper.getGroupIds();
            if(yHasNull) allYIds.push(NullGroupId);

            allXIds.forEach((xGroupId: number) => {
                allYIds.forEach((yGroupId: number) => {
                    if (exist[xGroupId] && exist[xGroupId][yGroupId]) return;

                    let key = new FieldGroupedValueList([
                        new FieldGroupedValue(fieldX, xGroupId),
                        new FieldGroupedValue(fieldY, yGroupId)
                    ]);

                    data.push(new Datum(
                        key.hash,
                        key,
                        EmptyConfidenceInterval,
                        this.accumulator.initAccumulatedValue
                    ));
                })
            });

            data = this.aggregate(data);
        }

        data.sort(this.ordering(this.orderingAttributeGetter, this.orderingDirection));

        this.visibleData = data;

        return data;
    }

    convertToPartialKeyValues(result: any): PartialKeyValue[] {
        return result.map((kv: [string, number, number, number, number, number, number]) => {
            let [key, sum, ssum, count, min, max, nullCount] = kv;
            let field = this.groupBy.fields[0];
            let fgvl = new FieldGroupedValueList([
                new FieldGroupedValue(field, field.group(key))
            ]);
            let partialValue = new PartialValue(sum, ssum, count, min, max, nullCount);

            return {
                key: fgvl,
                value: partialValue
            } as PartialKeyValue
        });
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
        let field = this.groupBy.fields[0];
        return new EqualPredicate(field, d.keys.list[0].value());
    }

    toJSON() {
        return {
            id: this.id,
            type: this.name,
            target: this.target.toJSON(),
            grouping: this.groupBy.fields[0].toJSON(),
            where: this.where.toJSON()
        }
    }
}

export class EmptyQuery extends AggregateQuery {
    name = "EmptyQuery";
    hasAggregateFunction = false;

    constructor(public dataset: Dataset) {
        super(null, null, null, dataset, null, null);
    }

    accumulate(partialResponses: PartialKeyValue[], processedRows: number) {
        this.lastUpdated = +new Date();
    }

    combine(field: FieldTrait) {
        if (field.vlType === VlType.Quantitative) {
            return new Histogram1DQuery(field as QuantitativeField, this.dataset, new AndPredicate([]));
        }
        else if ([VlType.Ordinal, VlType.Nominal].includes(field.vlType)) {
            return new Frequency1DQuery(field, this.dataset, new AndPredicate([]));
        }

        throw new ServerError("only EmptyQuery + [Q, O, N, D] is possible");
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

    isRankAvailable = false;
    isPowerLawAvailable = true;
    isNormalAvailable = true;
    isLinearAvailable = false;

    hasAggregateFunction = false;

    aggregationLevel = 2;
    minLevel = 1;
    maxLevel = 16;

    constructor(public grouping: QuantitativeField,
        public dataset: Dataset,
        public where: AndPredicate) {
        super(
            new CountAccumulator(),
            new CountApproximator(),
            null,
            dataset,
            new GroupBy([grouping]),
            where);

        assert(grouping.vlType, VlType.Quantitative);
    }

    combine(field: FieldTrait) {
        if (field.vlType === VlType.Quantitative)
            return new Histogram2DQuery(
                this.grouping,
                field as QuantitativeField,
                this.dataset,
                this.where);

        return new AggregateQuery(
            new AllAccumulator(),
            new MeanApproximator(),
            this.grouping,
            this.dataset,
            new GroupBy([field]),
            this.where);
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
            let value: AccumulatedValue = aggregated[id];
            let key = new FieldGroupedValueList([
                new FieldGroupedValue(this.grouping, [
                    nid * level,
                    (nid + 1) * level - 1])
            ]);

            result.push(new Datum(
                key.hash,
                key,
                value.count > 0 ? this.approximator.approximate(
                    value,
                    this.visibleProgress.processedPercent(),
                    this.visibleProgress.processedRows,
                    this.visibleProgress.numRows
                ).range(3) : EmptyConfidenceInterval,
                value
            ))
        })

        return result;
    }

    convertToPartialKeyValues(result: any): PartialKeyValue[] {
        return result.map((kv: [number, number]) => {
            let [key, count] = kv;
            let field = this.groupBy.fields[0];
            let fgvl = new FieldGroupedValueList([
                new FieldGroupedValue(field, isNull(key) ? NullGroupId : key)
            ]);
            let partialValue = new PartialValue(0, 0, count, 0, 0, 0);

            return {
                key: fgvl,
                value: partialValue
            } as PartialKeyValue
        });
    }

    getPredicateFromDatum(d: Datum) {
        let field = this.groupBy.fields[0];
        let range: [number, number] = d.keys.list[0].value() as [number, number];
        let includeEnd = range[1] == (field as QuantitativeField).grouper.max;

        return new RangePredicate(field, range[0], range[1], includeEnd);
    }

    toJSON(): any {
        return {
            id: this.id,
            type: this.name,
            grouping: this.grouping.toJSON(),
            where: this.where.toJSON()
        }
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

    isRankAvailable = false;
    isPowerLawAvailable = false;
    isNormalAvailable = false;
    isLinearAvailable = true;

    hasAggregateFunction = false;

    aggregationLevelX = 2;
    minLevelX = 1;
    maxLevelX = 16;

    aggregationLevelY = 2;
    minLevelY = 1;
    maxLevelY = 16;

    constructor(
        public grouping1: QuantitativeField,
        public grouping2: QuantitativeField,
        public dataset: Dataset,
        public where: AndPredicate) {
        super(
            new AllAccumulator(),
            new CountApproximator(),
            null,
            dataset,
            new GroupBy([grouping1, grouping2]),
            where);

        assert(grouping1.vlType, VlType.Quantitative);
        assert(grouping2.vlType, VlType.Quantitative);
    }

    combine(field: FieldTrait): AggregateQuery {
        throw new Error(`${this.name} cannot be combined`);
    }

    compatible(fields: FieldTrait[]) {
        return [];
    }

    aggregate(data: Datum[]) {
        const xLevel = this.aggregationLevelX;
        const yLevel = this.aggregationLevelY;

        // level = 4
        // [-4 ... -1], [0 ... 3], [4 ... 7]

        let aggregated: {
            [id: number]:
            {
                [id: number]: AccumulatedValue
            }
        } = {};

        let result: Datum[] = [];

        data.forEach(d => {
            let xId = d.keys.list[0].groupId;
            let yId = d.keys.list[1].groupId;

            if (xId === NullGroupId && yId === NullGroupId) {
                result.push(d);
                return;
            }

            let xBinId = xId === NullGroupId ? NullGroupId : Math.floor(<number>xId / xLevel);
            let yBinId = yId === NullGroupId ? NullGroupId : Math.floor(<number>yId / yLevel);

            if (!(xBinId in aggregated))
                aggregated[xBinId] = {};

            if (!(yBinId in aggregated[xBinId]))
                aggregated[xBinId][yBinId] = this.accumulator.initAccumulatedValue;

            aggregated[xBinId][yBinId] =
                this.accumulator.accumulate(aggregated[xBinId][yBinId], d.accumulatedValue.toPartial());
        })

        d3.keys(aggregated).forEach(xId => {
            d3.keys(aggregated[xId]).forEach(yId => {
                let xNewId: GroupIdType = +xId;
                let yNewId: GroupIdType = +yId;

                if(xNewId != NullGroupId)
                    xNewId = [xNewId * xLevel, (xNewId + 1) * xLevel - 1]

                if(yNewId != NullGroupId)
                    yNewId = [yNewId * yLevel, (yNewId + 1) * yLevel - 1]

                let value: AccumulatedValue = aggregated[xId][yId];

                let key = new FieldGroupedValueList([
                    new FieldGroupedValue(this.grouping1, xNewId),
                    new FieldGroupedValue(this.grouping2, yNewId)
                ]);

                result.push(new Datum(
                    key.hash,
                    key,
                    value.count > 0 ?
                    this.approximator.approximate(
                        value,
                        this.visibleProgress.processedPercent(),
                        this.visibleProgress.processedRows,
                        this.visibleProgress.numRows
                    ).range(3) : EmptyConfidenceInterval,
                    value
                ))
            })
        })

        return result;
    }

    getPredicateFromDatum(d: Datum) {
        let fieldX = this.groupBy.fields[0];
        let rangeX: [number, number] = d.keys.list[0].value() as [number, number];
        let includeEndX = rangeX[1] == (fieldX as QuantitativeField).grouper.max;

        let fieldY = this.groupBy.fields[1];
        let rangeY: [number, number] = d.keys.list[1].value() as [number, number];
        let includeEndY = rangeY[1] == (fieldY as QuantitativeField).grouper.max;

        return new AndPredicate([
            new RangePredicate(fieldX, rangeX[0], rangeX[1], includeEndX),
            new RangePredicate(fieldY, rangeY[0], rangeY[1], includeEndY)
        ]);
    }

    convertToPartialKeyValues(result: any): PartialKeyValue[] {
        return result.map((kv: [[number, number], number]) => {
            let [[key1, key2], count] = kv;
            let field1 = this.groupBy.fields[0];
            let field2 = this.groupBy.fields[1];
            let fgvl = new FieldGroupedValueList([
                new FieldGroupedValue(field1, isNull(key1) ? NullGroupId : key1),
                new FieldGroupedValue(field2, isNull(key2) ? NullGroupId : key2)
            ]);
            let partialValue = new PartialValue(0, 0, count, 0, 0, 0);

            return {
                key: fgvl,
                value: partialValue
            } as PartialKeyValue
        });
    }

    toJSON(): any {
        return {
            id: this.id,
            type: this.name,
            grouping1: this.grouping1.toJSON(),
            grouping2: this.grouping2.toJSON(),
            where: this.where.toJSON()
        }
    }
}

/**
 * one categorical
 */
export class Frequency1DQuery extends AggregateQuery {
    name = "Frequency1DQuery";
    ordering = NumericalOrdering;
    orderingAttributeGetter = (d: Datum) => d.ci3.center;

    isRankAvailable = true;
    isPowerLawAvailable = true;
    isNormalAvailable = false;
    isLinearAvailable = false;

    hasAggregateFunction = false;

    constructor(public grouping: FieldTrait,
        public dataset: Dataset,
        public where: AndPredicate) {
        super(
            new CountAccumulator(),
            new CountApproximator(),
            null,
            dataset,
            new GroupBy([grouping]),
            where);

        assertIn(grouping.vlType, [VlType.Nominal, VlType.Ordinal]);
    }

    combine(field: FieldTrait) {
        if (field.vlType === VlType.Quantitative) {
            return new AggregateQuery(
                new AllAccumulator(),
                new MeanApproximator(),
                field,
                this.dataset,
                new GroupBy([this.grouping]),
                this.where);
        }

        return new Frequency2DQuery(
            this.grouping,
            field,
            this.dataset,
            this.where);
    }

    getPredicateFromDatum(d: Datum) {
        let field = this.groupBy.fields[0];
        return new EqualPredicate(field, d.keys.list[0].value());
    }

    toJSON(): any {
        return {
            id: this.id,
            type: this.name,
            grouping: this.grouping.toJSON(),
            where: this.where.toJSON()
        }
    }

    convertToPartialKeyValues(result: [string, number][]) {
        return result.map((kv: [string, number]) => {
            let [key, value] = kv;
            let field = this.grouping;
            let fgvl = new FieldGroupedValueList([
                new FieldGroupedValue(field, field.group(key))
            ]);
            let partialValue = new PartialValue(0, 0, value, 0, 0, 0);

            return {
                key: fgvl,
                value: partialValue
            } as PartialKeyValue
        });
    }
}

export class Frequency2DQuery extends AggregateQuery {
    name = "Frequency2DQuery";
    ordering = NumericalOrdering;
    orderingAttributeGetter = (d: Datum) => (d.ci3 as ConfidenceInterval).center;

    isRankAvailable = false;
    isPowerLawAvailable = false;
    isNormalAvailable = false;
    isLinearAvailable = false;

    hasAggregateFunction = false;

    constructor(
        public grouping1: FieldTrait,
        public grouping2: FieldTrait,
        public dataset: Dataset,
        public where: AndPredicate) {

        super(
            new CountAccumulator(),
            new CountApproximator(),
            null,
            dataset,
            new GroupBy([grouping1, grouping2]),
            where);

        assertIn(grouping1.vlType, [VlType.Nominal, VlType.Ordinal]);
        assertIn(grouping2.vlType, [VlType.Nominal, VlType.Ordinal]);
    }

    combine(field: FieldTrait): AggregateQuery {
        throw new Error(`${this.name} cannot be combined`);
    }

    compatible(fields: FieldTrait[]) {
        return [];
    }

    getPredicateFromDatum(d: Datum) {
        let field1 = this.groupBy.fields[0];
        let field2 = this.groupBy.fields[1];
        return new AndPredicate([
            new EqualPredicate(field1, d.keys.list[0].value()),
            new EqualPredicate(field2, d.keys.list[1].value())
        ])
    }

    toJSON(): any {
        return {
            id: this.id,
            type: this.name,
            grouping1: this.grouping1.toJSON(),
            grouping2: this.grouping2.toJSON(),
            where: this.where.toJSON()
        }
    }

    convertToPartialKeyValues(result: [string, string, number][]) {
        return result.map((kv: [string, string, number]) => {
            let [key1, key2, value] = kv;
            const field1 = this.grouping1;
            const field2 = this.grouping2;

            let fgvl = new FieldGroupedValueList([
                new FieldGroupedValue(field1, field1.group(key1)),
                new FieldGroupedValue(field2, field2.group(key2)),
            ]);
            let partialValue = new PartialValue(0, 0, value, 0, 0, 0);

            return {
                key: fgvl,
                value: partialValue
            } as PartialKeyValue
        });
    }
}




