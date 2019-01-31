import { FieldGroupedValueList } from "./field";
import { ConfidenceInterval } from "./approx";
import { AccumulatedValue } from "./accum";
import { NullGroupId } from "./grouper";

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
