import * as util from '../util';
import { isNumber, isString, isNull } from 'util';
import { FieldTrait, guess, VlType, QuantitativeField, NominalField, DozenField, KeyField } from './field';
import * as d3 from 'd3-array';

export class Dataset {
    constructor(public rows: any[], public fields?: FieldTrait[]) {
        if (!fields) {
            this.fields = this.guess(rows);
        }
    }

    guess(rows: any[]): FieldTrait[] {
        let n = Math.min(rows.length * 0.1, 200);
        let indices = util.arange(n);
        let fields: FieldTrait[] = [];

        Object.keys(rows[0]).forEach(name => {
            let values = indices.map(i => {
                return rows[i][name];
            });

            let [dataType, vlType, nullable] = guess(values);

            let field: FieldTrait;

            if (vlType === VlType.Quantitative) {
                field = new QuantitativeField(name, dataType,
                    d3.min(values), d3.max(values), 20, nullable);
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
