import * as util from '../util';
import { FieldTrait, guess, VlType, QuantitativeField, NominalField, DozenField, KeyField } from './field';
import * as d3 from 'd3-array';
import { Schema } from './schema';
import { isUndefined } from 'util';

export type Row = any;

export class Dataset {
    constructor(public schema: Schema, public rows: Row[], public fields?: FieldTrait[]) {
        if (!fields) {
            this.fields = this.guess(schema, rows);
        }
    }

    guess(schema: Schema, rows: Row[]): FieldTrait[] {
        let n = Math.min(rows.length * 0.1, 200);
        let indices = util.arange(n);
        let fields: FieldTrait[] = [];

        Object.keys(rows[0]).forEach(name => {
            let values = indices.map(i => {
                return rows[i][name];
            });

            let [dataType, vlType, nullable] = guess(values);

            let field: FieldTrait;
            let columnSchema = schema.getColumnSchema(name);

            if(columnSchema) {
                vlType = columnSchema.type;
                if(!isUndefined(columnSchema.nullable)) nullable = columnSchema.nullable;
            }

            if (vlType === VlType.Quantitative) {
                let minValue = (columnSchema && !isUndefined(columnSchema.min)) ? columnSchema.min : d3.min(values);
                let maxValue = (columnSchema && !isUndefined(columnSchema.max)) ? columnSchema.max : d3.max(values);
                let numBins = (columnSchema && !isUndefined(columnSchema.numBins)) ? columnSchema.numBins : 40;
                field = new QuantitativeField(name, dataType, minValue, maxValue, numBins, nullable);
            }
            else if (vlType === VlType.Nominal) {
                field = new NominalField(name, dataType, nullable);
            }
            else if (vlType === VlType.Dozen) {
                field = new DozenField(name, dataType, nullable);
            }
            else {
                field = new KeyField(name, dataType, nullable);
            }

            fields.push(field);
        });

        fields.sort((a, b) => {
            if (a.name > b.name) return 1;
            else if (a.name < b.name) return -1;
            return 0;
        });

        return fields;
    }

    getFieldByName(name: string) {
        let fields = this.fields.filter(field => field.name === name);

        if (!fields.length) throw `no field named ${name} exists`;

        return fields[0];
    }

    get length() {
        return this.rows.length;
    }
}
