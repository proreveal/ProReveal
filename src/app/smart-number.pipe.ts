import { Pipe, PipeTransform } from '@angular/core';
import * as d3 from 'd3';
import { FieldTrait, QuantitativeField } from './data/field';
import { Constants, Languages } from './constants';
import { formatKRW } from './util';

const siFormat = d3.format('.3s')
const gFormat = d3.format(',.3r');

@Pipe({
    name: 'smartNumber'
})
export class SmartNumberPipe implements PipeTransform {


    transform(value: number, field?: FieldTrait): any {
        if(field && field instanceof QuantitativeField && field.unit === 'dollar' && Constants.lang === Languages.ko_KR) {
            return formatKRW(value);
        }

        console.log()
        if(Math.abs(value) > 10000) return siFormat(value);

        return gFormat(value);
    }
}
