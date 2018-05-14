import * as util from './util';

export enum DataType {
    String,
    Integer,
    Real
}

export enum VlType {
    Quantitative = "Quantitative",
    Dozen = "Dozen",
    Ordinal = "Ordinal",
    Nominal = "Nominal",
    Key = "Key"
}

export interface FieldTrait {
    name: string;
    dataType: DataType;
    vlType: VlType;
    nullable: boolean;
}

export class Field {
    static guess(values: any[]): [DataType, VlType, boolean] {
        let dataType = this.guessDataType(values);
        let unique = {};
        let n = values.length;

        values.forEach(value => unique[value] = true);

        let cardinality = Object.keys(unique).length;
        let vlType:VlType;

        if(cardinality <= 20) vlType = VlType.Dozen;
        else if(dataType === DataType.Integer || dataType === DataType.Real)
            vlType = VlType.Quantitative;
        else if(cardinality <= 100)
            vlType = VlType.Nominal;
        else
            vlType = VlType.Key;

        return [dataType, vlType, unique[null as any] > 0];
    }

    static guessDataType(values: any[]) {
        for(let i = 0; i < values.length; i++) {
            let value = values[i];
            let float = parseFloat(value);

            if(isNaN(float)) return DataType.String;
            if(!Number.isInteger(float)) return DataType.Real;
        }

        return DataType.Integer;
    }
}

export class QuantitativeField implements FieldTrait {
    vlType: VlType = VlType.Quantitative;
    min: number;
    max: number;

    constructor(public name: string, public dataType: DataType,
        public nullable: boolean = false) {
    }
}

export class CategoricalField implements FieldTrait {
    vlType: VlType = VlType.Dozen;

    constructor(public name: string, public dataType: DataType,
        public nullable: boolean = false) {

    }
}

export class DozenField extends CategoricalField {
    vlType: VlType = VlType.Dozen;
}

export class OrdinalField extends CategoricalField {
    vlType: VlType = VlType.Ordinal;
}

export class NominalField extends CategoricalField {
    vlType: VlType = VlType.Nominal;
}

export class KeyField extends CategoricalField {
    vlType: VlType = VlType.Key;
}

export class Dataset {
    constructor(public rows: any[], public fields?: FieldTrait[]) {
        if (!fields) {
            this.fields = this.guess(rows);
        }
    }

    guess(rows: any[]): FieldTrait[] {
        let n = Math.min(rows.length * 0.1, 200);
        let indices = util.arange(n).map(d => Math.floor(Math.random() * rows.length));
        let fields: FieldTrait[] = [];

        Object.keys(rows[0]).forEach(name => {
            let values = indices.map(i => {
                return rows[i][name];
            });

            let [dataType, vlType, nullable] = Field.guess(values);

            let field:FieldTrait;

            if(vlType === VlType.Quantitative){
                field = new QuantitativeField(name, dataType);
            }
            else if(vlType === VlType.Nominal){
                field = new NominalField(name, dataType);
            }
            else if(vlType === VlType.Dozen){
                field = new DozenField(name, dataType);
            }
            else {
                field = new KeyField(name, dataType);
            }

            fields.push(field);
        });

        fields.sort((a, b) => {
            if(a.name > b.name) return 1;
            else if(a.name < b.name) return -1;
            return 0;
        });

        return fields;
    }
}
