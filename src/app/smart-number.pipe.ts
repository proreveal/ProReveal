import { Pipe, PipeTransform } from '@angular/core';
import * as d3 from 'd3';

const siFormat = d3.format('.3s')
const gFormat = d3.format('.3g');

@Pipe({
    name: 'smartNumber'
})
export class SmartNumberPipe implements PipeTransform {


    transform(value: number, args?: any): any {
        if(Math.abs(value) > 1000) return siFormat(value);

        return gFormat(value);
    }

}
