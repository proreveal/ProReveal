import { Component, OnInit, Input, ElementRef, ViewChild, OnChanges, SimpleChange, SimpleChanges, DoCheck, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { ExplorationNode } from '../exploration/exploration-node';
import * as d3 from 'd3';
import * as util from '../util';
import { AccumulatedResponseDictionary } from '../data/accumulator';
import { VisConstants } from './vis-constants';
import { AggregateQuery } from '../data/query';
import { measure } from '../d3-utils/measure';
import { translate, selectOrAppend } from '../d3-utils/d3-utils';
import { Gradient } from './errorbars/gradient';
import { FieldGroupedValueList } from '../data/field';
import { ConfidenceInterval } from '../data/approx';

@Component({
    selector: 'vis',
    templateUrl: './vis.component.html',
    styleUrls: ['./vis.component.css']
})
export class VisComponent implements OnInit, DoCheck {
    @Input() node: ExplorationNode;
    @ViewChild('svg') svg: ElementRef;

    queryLastUpdated: number;
    lastNode: ExplorationNode;

    gradient = new Gradient();

    constructor(private cd: ChangeDetectorRef) { }

    ngOnInit() {
        this.queryLastUpdated = this.node.query.lastUpdated;

        this.gradient.setup(d3.select(this.svg.nativeElement).append('defs'));

        this.render();
    }

    ngDoCheck() {
        if (this.queryLastUpdated < this.node.query.lastUpdated || this.lastNode != this.node) {
            this.queryLastUpdated = this.node.query.lastUpdated;
            this.lastNode = this.node;

            this.render();
        }
    }

    render() {
        let svg = d3.select(this.svg.nativeElement);
        let data = this.node.query.resultList().map(
            value => {
                const ai = (this.node.query as AggregateQuery).accumulator
                    .approximate(value[1], this.node.query.progress.processedPercent());

                return {
                    id: value[0].hash,
                    keys: value[0],
                    ci3stdev: ai.range(3)
                };
            });

        data.sort((a, b) => { return b.ci3stdev.center - a.ci3stdev.center; });

        const height = VisConstants.horizontalBars.axis.height * 2 +
            VisConstants.horizontalBars.height * data.length;
        const width = 800;

        svg.attr('width', width).attr('height', height);

        let [, longest, ] = util.amax(data, d => d.keys.list[0].valueString().length);
        const labelWidth = measure(longest.keys.list[0].valueString()).width;

        const xMin = 0;
        const xMax = d3.max(data, d => d.ci3stdev.high);
        const xScale = d3.scaleLinear().domain([xMin, xMax]).range([labelWidth, width - VisConstants.padding]);
        const yScale = d3.scaleBand().domain(util.srange(data.length))
            .range([VisConstants.horizontalBars.axis.height,
                height - VisConstants.horizontalBars.axis.height])
            .padding(0.1);

        const topAxis = d3.axisTop(xScale);

        selectOrAppend(svg, 'g', '.x.axis.top')
            .attr('transform', translate(0, VisConstants.horizontalBars.axis.height))
            .transition()
            .call(topAxis as any);

        const labels = svg
            .selectAll('text.label')
            .data(data, (d:any) => d.id);

        let enter = labels.enter().append('text').attr('class', 'label')
            .style('text-anchor', 'end')
            .attr('font-size', '.8rem')
            .attr('dy', '.8rem')

        labels.merge(enter)
            .attr('transform', (d, i) => translate(labelWidth - VisConstants.padding, yScale(i+'')))
            .text(d => d.keys.list[0].valueString())

        labels.exit().remove();

        const leftBars = svg
            .selectAll('rect.left.bar')
            .data(data, (d:any) => d.id);

        enter = leftBars
            .enter()
            .append('rect')
            .attr('class', 'left bar')

        leftBars.merge(enter)
            .attr('height', yScale.bandwidth())
            .attr('width', d => xScale(d.ci3stdev.center) - xScale(d.ci3stdev.low))
            .attr('transform', (d, i) => translate(xScale(d.ci3stdev.low), yScale(i+'')))
            .attr('fill', this.gradient.leftUrl())

        leftBars.exit().remove();

        const rightBars = svg
            .selectAll('rect.right.bar')
            .data(data, (d:any) => d.id);

        enter = rightBars
            .enter()
            .append('rect')
            .attr('class', 'right bar')

        rightBars.merge(enter)
            .attr('height', yScale.bandwidth())
            .attr('width', d => xScale(d.ci3stdev.high) - xScale(d.ci3stdev.center))
            .attr('transform', (d, i) => translate(xScale(d.ci3stdev.center), yScale(i+'')))
            .attr('fill', this.gradient.rightUrl())

        rightBars.exit().remove();

        const centerLines = svg
            .selectAll('line.center')
            .data(data, (d:any) => d.id);

        enter = centerLines
            .enter()
            .append('line')
            .attr('class', 'center')

        centerLines.merge(enter)
            .attr('x1', (d, i) => xScale(d.ci3stdev.center))
            .attr('y1', (d, i) => yScale(i + ''))
            .attr('x2', (d, i) => xScale(d.ci3stdev.center))
            .attr('y2', (d, i) => yScale(i + '') + yScale.bandwidth())
            .style('stroke-width', 0.5)
            .style('stroke', 'black')
            .style('shape-rendering', 'crispEdges')

        centerLines.exit().remove();

        const bottomAxis = d3.axisBottom(xScale);

        selectOrAppend(svg, 'g', '.x.axis.bottom')
            .attr('transform', translate(0, height - VisConstants.horizontalBars.axis.height))
            .transition()
            .call(bottomAxis as any);
    }
}
