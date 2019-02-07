import { FieldGroupedValueList } from "./field";
import { ConfidenceInterval } from "./approx";
import { AccumulatedValue } from "./accum";

export class Datum {
    constructor(public id: string,
        public keys: FieldGroupedValueList,
        public ci3: ConfidenceInterval,
        public accumulatedValue: AccumulatedValue) {

        }
};
