import { Component, OnInit, Input, DoCheck, ViewChild, ElementRef } from '@angular/core';
import { Safeguard } from '../../safeguard/safeguard';
import * as d3 from 'd3';
import { translate, selectOrAppend } from '../../d3-utils/d3-utils';
import { Constants as C } from '../../constants';
import { ValidityTypes } from '../../safeguard/validity';

@Component({
    selector: 'sg-history',
    templateUrl: './sg-history.component.html',
    styleUrls: ['./sg-history.component.scss']
})
export class SgHistoryComponent implements OnInit, DoCheck {
    @Input() sg: Safeguard;
    @ViewChild('svg', { static: true }) svg: ElementRef<SVGSVGElement>;

    lastUpdated: number = 0;

    constructor() { }

    ngOnInit() {
    }

    ngDoCheck() {
        if (this.sg && this.svg && this.lastUpdated < this.sg.lastUpdated) {
            this.lastUpdated = this.sg.lastUpdated;

            this.render();
        }
    }

    render() {
        let data = this.sg.history.map((d, i) => [d, i] as [number, number]);
        let svg = d3.select(this.svg.nativeElement);
        let width = C.history.width;
        let height = C.history.height;

        svg.attr('width', width).attr('height', height)

        let margin = { top: 5, right: 10, bottom: 10, left: 30 };

        width -= margin.left + margin.right;
        height -= margin.top + margin.bottom;

        let g = selectOrAppend(svg, 'g', '.wrapper');

        g.attr('transform', translate(margin.left, margin.top));
        let n = data.length;

        let xScale = d3.scalePoint()
            .domain(d3.range(n).map(d => d + ''))
            .rangeRound([0, width])

        let yLabel = this.sg.validityType.toString();
        let yScale = d3.scaleLinear().range([height, 0]);

        if(this.sg.validityType == ValidityTypes.Error)
            yScale.domain([0, d3.max(data, d => d[0])]).nice(3)
        else
            yScale.domain([0, 1])

        let line = d3.line()
            .x(d => xScale(d[1] + ''))
            .y(d => yScale(d[0]))
        //.curve(d3.curveMonotoneX) // apply smoothing to the line


        selectOrAppend(g, 'g', '.x.axis')
            .attr('transform', translate(0, height))
            .call(
                d3.axisBottom(xScale)
                    .tickSize(3)
                    .tickFormat(d => '')
            )

        selectOrAppend(g, 'g', '.y.axis')
            .call(d3.axisLeft(yScale).ticks(3));

        selectOrAppend(g, 'path', '.path')
            .datum(data)
            .attr('d', line)
            .style('fill', 'none')
            .style('stroke', 'steelblue')
            .style('stroke-width', 2)

        selectOrAppend(g, 'text', '.x.label')
            .text('Iteration')
            .attr('text-anchor', 'end')
            .attr('transform', translate(width, height - 3))
            .style('opacity', .5)
            .style('font-size', '.7rem')
            .style('font-style', 'italic')

        selectOrAppend(g, 'text', '.y.label')
            .text(yLabel)
            .attr('text-anchor', 'start')
            .attr('transform', translate(3, 10))
            .style('opacity', .5)
            .style('font-size', '.7rem')
            .style('font-style', 'italic')
    }
}
