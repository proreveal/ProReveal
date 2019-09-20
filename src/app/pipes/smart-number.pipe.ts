import { Pipe, PipeTransform } from '@angular/core';
import * as d3 from 'd3';
import { FieldTrait, QuantitativeField } from '../data/field';
import { Constants } from '../constants';
import { formatKRW } from '../util';
import { QuantitativeUnit } from '../data/unit';
import { Locale } from '../locales/locale';

const siFormat = d3.format('.3s')
const gFormat = d3.format(',.3r');

@Pipe({
    name: 'smartNumber'
})
export class SmartNumberPipe implements PipeTransform {
    transform(value: number, field?: FieldTrait): any {
        if(field && field instanceof QuantitativeField
            && field.unit === QuantitativeUnit.USD && Constants.locale.name === Locale.ko_KR) {
            return Constants.currencyFormatter(value);
        }

        if(value == 0) return '0';

        if(Math.abs(value) > 10000) return siFormat(value);

        return gFormat(value);
    }
}
