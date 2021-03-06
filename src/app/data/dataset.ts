import * as util from '../util';
import { FieldTrait, guess, VlType, QuantitativeField, NominalField, KeyField, getDataType, OrdinalField } from './field';
import * as d3 from 'd3-array';
import { Schema } from './schema';
import { isUndefined } from 'util';
import { Constants } from '../constants';
import { QuantitativeUnit } from './unit';
import { Locale } from '../locales/locale';
import { Sampler } from './sampler';

export type Row = any;

export class Dataset {
    fields: FieldTrait[]

    constructor(public name: string, public schema: Schema, public rows: Row[] = [], public sampler: Sampler) {
        if(rows.length > 0) {
            Object.keys(rows[0]).forEach(name => {
                let columnSchema = schema.getColumnSchema(name);
                if(!columnSchema) throw new Error(`${name} does not exist in the schema`);

                let unit = columnSchema.unit;
                if(unit === QuantitativeUnit.USD && Constants.locale.name == Locale.ko_KR) {
                    rows.forEach(row => {
                        row[name] *= Constants.exchangeRate;
                    })
                }
            });
        }

        this.fields = this.guess(schema, rows);
    }

    guess(schema: Schema, rows: Row[]): FieldTrait[] {
        let n = rows.length; //Math.min(rows.length * 0.1, 200);
        let indices = util.arange(n);
        let fields: FieldTrait[] = [];

        if(rows.length > 0) {
            Object.keys(rows[0]).forEach(name => {
                let columnSchema = schema.getColumnSchema(name);
                let unit = columnSchema.unit;
                let order = columnSchema.order;

                let values = indices.map(i => rows[i][name]);

                let [dataType, vlType, nullable] = guess(values);

                let field: FieldTrait;

                if(columnSchema) {
                    vlType = columnSchema.vlType;
                    if(!isUndefined(columnSchema.nullable)) nullable = columnSchema.nullable;
                    if(!isUndefined(columnSchema.dataType)) dataType = getDataType(columnSchema.dataType);
                    if(columnSchema.hidden) return;
                }

                if (vlType === VlType.Quantitative) {
                    let minValue = (columnSchema && !isUndefined(columnSchema.min)) ? columnSchema.min : d3.min(values);
                    let maxValue = (columnSchema && !isUndefined(columnSchema.max)) ? columnSchema.max : d3.max(values);
                    let numBins = (columnSchema && !isUndefined(columnSchema.numBins)) ? columnSchema.numBins : 40;
                    field = new QuantitativeField(name, dataType, minValue, maxValue, numBins, nullable, unit, order);
                }
                else if (vlType === VlType.Ordinal) {
                    field = new OrdinalField(name, dataType, nullable, order);
                }
                else if (vlType === VlType.Nominal) {
                    field = new NominalField(name, dataType, nullable, order);
                }
                else {
                    field = new KeyField(name, dataType, nullable, order);
                }

                fields.push(field);
            });
        }
        else {
            schema.columns.forEach(columnSchema => {
                if(columnSchema.hidden) return;

                let vlType = columnSchema.vlType;
                let nullable = true;
                let dataType = columnSchema.dataType;

                if(!isUndefined(columnSchema.nullable)) nullable = columnSchema.nullable;

                let field:FieldTrait;

                let name = columnSchema.name;
                let min = columnSchema.min;
                let max = columnSchema.max;
                let numBins = columnSchema.numBins;
                let unit = columnSchema.unit;
                let order = columnSchema.order;

                if (vlType === VlType.Quantitative) {
                    field = new QuantitativeField(name, dataType, min, max, numBins, nullable, unit, order);
                }
                else if (vlType === VlType.Ordinal) {
                    field = new OrdinalField(name, dataType, nullable, order);
                }
                else if (vlType === VlType.Nominal) {
                    field = new NominalField(name, dataType, nullable, order);
                }
                else {
                    field = new KeyField(name, dataType, nullable, order);
                }

                fields.push(field);
            })
        }

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
}
