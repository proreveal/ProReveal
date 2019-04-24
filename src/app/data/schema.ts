import { VlType, getVlType, DataType } from "./field";
import { QuantitativeUnit } from "./unit";

export class ColumnSchema {
    constructor(public name: string, public vlType: VlType,
        public dataType: DataType,
        public nullable: boolean, public min: number, public max: number,
        public numBins: number, public hidden: boolean = false, public unit: QuantitativeUnit, public order: number) {

    }
}

export class Schema {
    columns: ColumnSchema[] = [];
    dict: { [name: string]: ColumnSchema } = {};

    constructor(schema: any[]) {
        schema.forEach(sch => {
            const schema = new ColumnSchema(
                sch.name,
                getVlType(sch.vlType),
                sch.dataType,
                sch.nullable,
                sch.min,
                sch.max,
                sch.numBins,
                sch.hidden,
                sch.unit,
                sch.order
            );

            this.columns.push(schema);

            this.dict[schema.name] = schema;
        })
    }

    getColumnSchema(name: string) {
        return this.dict[name];
    }
}
