import { VlType, getVlType } from "./field";
import { QuantitativeUnit } from "./unit";

export class ColumnSchema {
    constructor(public name: string, public type: VlType,
        public nullable: boolean, public min: number, public max: number,
        public numBins: number, public hidden: boolean = false, public unit: QuantitativeUnit) {

    }
}

export class Schema {
    columns: ColumnSchema[] = [];
    dict: { [name: string]: ColumnSchema } = {};

    constructor(schema: any[]) {

        schema.forEach(sch => {
            const schema = new ColumnSchema(
                sch.name,
                getVlType(sch.type),
                sch.nullable,
                sch.min,
                sch.max,
                sch.numBins,
                sch.hidden,
                sch.unit
            );

            this.columns.push(schema);

            this.dict[schema.name] = schema;
        })
    }

    getColumnSchema(name: string) {
        return this.dict[name];
    }
}
