import { AccumulatedValue } from "./accum";
import { FieldGroupedValueList } from "./field-grouped-value-list";
import { ConfidenceInterval } from "./confidence-interval";

export class Datum {
    constructor(public id: string,
        public keys: FieldGroupedValueList,
        public ci3: ConfidenceInterval,
        public accumulatedValue: AccumulatedValue) {

        }

    toLog() {
        return {
            id: this.id,
            keys: this.keys.list.map(kgv => kgv.toLog()),
            ci3: this.ci3.toLog(),
            accumulatedValue: this.accumulatedValue.toLog()
        };
    }
};
