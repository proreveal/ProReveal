import { FieldTrait } from "./field";
import { Dataset } from "./dataset";

export enum PredicateTypes {
    And = 'And',
    Range = 'Range',
    Equal = 'Equal'
};

export abstract class Predicate {
    test(row: any): boolean {
        return true;
    }

    and(predicate: Predicate): AndPredicate {
        return new AndPredicate([this, predicate]);
    }

    abstract toLog(): any;
    abstract toJSON(): any;

    static fromJSON(json: any, dataset: Dataset) {
        if(!json) return null;

        if(json.type == PredicateTypes.And)
            return new AndPredicate(json.predicates.map(spec => Predicate.fromJSON(spec, dataset)))

        if(json.type == PredicateTypes.Range)
            return new RangePredicate(
                dataset.getFieldByName(json.field.name),
                json.start,
                json.end,
                json.includeEnd
            );

        if(json.type == PredicateTypes.Equal)
            return new EqualPredicate(
                dataset.getFieldByName(json.field.name),
                json.expected
            );

        throw new Error(`Invalid predicate spec ${JSON.stringify(json)}`);
    }
}

export class EqualPredicate extends Predicate {
    readonly type = PredicateTypes.Equal;

    constructor(public target: FieldTrait, public expected: any) {
        super();
    }

    test(row: any): boolean {
        return row[this.target.name] === this.expected;
    }

    toLog() {
        return {
            target: this.target.name,
            expected: this.expected
        };
    }

    toJSON() {
        return {
            type: this.type,
            field: this.target.toJSON(),
            expected: this.expected
        }
    }
}

export class RangePredicate extends Predicate {
    readonly type = PredicateTypes.Range;

    constructor(public target: FieldTrait, public start: number, public end: number, public includeEnd: boolean = false) {
        super();
    }

    test(row: any): boolean {
        const value = row[this.target.name];
        if (this.includeEnd) return this.start <= value && value <= this.end;
        return this.start <= value && value < this.end;
    }

    toLog() {
        return {
            target: this.target.name,
            start: this.start,
            end: this.end
        };
    }

    toJSON() {
        return {
            type: this.type,
            field: this.target.toJSON(),
            start: this.start,
            end: this.end,
            includeEnd: this.includeEnd
        }
    }
}

export class AndPredicate extends Predicate {
    readonly type = PredicateTypes.And;

    constructor(public predicates: Predicate[] = []) {
        super();
    }

    get length() { return this.predicates.length; }

    test(value: any): boolean {
        for (let i = 0; i < this.predicates.length; i++)
            if (!this.predicates[i].test(value)) return false;

        return true;
    }

    and(predicate: Predicate): AndPredicate {
        let clone = this.predicates.slice();

        if(predicate instanceof AndPredicate) {
            clone = clone.concat(predicate.predicates);
        }
        else clone.push(predicate);

        return new AndPredicate(clone);
    }

    clone() {
        return new AndPredicate(this.predicates.slice());
    }

    toLog() {
        return this.predicates.map(p => p.toLog());
    }

    flatten() {
        let res = [];
        this.predicates.forEach(pred => {
            if(pred instanceof AndPredicate) {
                res = res.concat(pred.flatten())
            } else {
                res.push(pred);
            }
        })

        return res;
    }

    toJSON() {
        if(this.predicates.length == 0) return null;
        return {
            type: this.type,
            predicates: this.flatten().map(pred => pred.toJSON())
        };
    }
}
