import { FieldTrait } from "./field";

export abstract class Predicate {
    test(row: any): boolean {
        return true;
    }

    and(predicate: Predicate): Predicate {
        return new AndPredicate([this, predicate]);
    }
}

export class TruePredicate extends Predicate {
    test(): boolean {
        return true;
    }
}

export class EqualPredicate extends Predicate {
    constructor(public target: FieldTrait, public expected: any) {
        super();
    }

    test(row: any): boolean {
        return row[this.target.name] === this.expected;
    }
}

export class RangePredicate extends Predicate {
    constructor(public target: FieldTrait, public start: number, public end: number, public includeEnd: boolean = false) {
        super();
    }

    test(row: any): boolean {
        const value = row[this.target.name];
        if (this.includeEnd) return this.start <= value && value <= this.end;
        return this.start <= value && value < this.end;
    }
}

export class AndPredicate extends Predicate {
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
}
