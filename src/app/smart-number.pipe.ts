import { Pipe, PipeTransform } from '@angular/core';
import * as d3 from 'd3';
import { formatKRW } from './util';
import { FieldTrait, QuantitativeField } from './data/field';
import { Constants, Languages } from './constants';

const siFormat = d3.format('.3s')
const gFormat = d3.format('.3g');
const krwFormat = formatKRW;

@Pipe({
    name: 'smartNumber'
})
export class SmartNumberPipe implements PipeTransform {


    transform(value: number, field?: FieldTrait): any {
        if(field && field instanceof QuantitativeField && field.unit === 'dollar' && Constants.lang === Languages.ko_KR) {
            return krwFormat(value);
        }

        if(Math.abs(value) > 1000) return siFormat(value);

        return gFormat(value);
    }

}
