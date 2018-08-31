export abstract class ConstantTrait {

}

export class PointValueConstant extends ConstantTrait {
    constructor(public value: number) {
        super();
    }
}

export class PointRankConstant extends ConstantTrait {
    constructor(public rank: number) {
        super();
    }
}

export class RangeValueConstant extends ConstantTrait {
    constructor(public from: number, public to: number ) {
        super();
    }
}

export class RangeRankConstant extends ConstantTrait {
    constructor(public from: number, public to: number) {
        super();
    }
}
