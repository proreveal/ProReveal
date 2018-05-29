import { Component, OnInit, Input, ElementRef, ViewChild, OnChanges, SimpleChange, SimpleChanges, DoCheck, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { ExplorationNode } from '../exploration/exploration-node';
import * as d3 from 'd3';
import * as util from '../util';
import { AccumulatedResponseDictionary } from '../data/accumulator';
import { VisConstants } from './vis-constants';
import { AggregateQuery } from '../data/query';

@Component({
    selector: 'vis',
    templateUrl: './vis.component.html',
    styleUrls: ['./vis.component.css']
})
export class VisComponent implements OnInit, DoCheck {
    @Input() node: ExplorationNode;
    @ViewChild('svg') svg: ElementRef;

    queryLastUpdated: number;

    constructor(private cd: ChangeDetectorRef) { }

    ngOnInit() {
        this.queryLastUpdated = this.node.query.lastUpdated;
        this.render();
    }

    ngDoCheck() {
        if (this.queryLastUpdated < this.node.query.lastUpdated) {
            this.queryLastUpdated = this.node.query.lastUpdated;

            this.render();
        }
    }

    render() {
        let svg = d3.select(this.svg.nativeElement);
        let data = this.node.query.resultList().map(
            value => { return {
                keys: value[0],
                ci: (this.node.query as AggregateQuery).accumulator
                .approximate(value[1], this.node.query.progress.processedPercent()).ci95()
            }; });

        data.sort((a, b) => { return b.ci.center - a.ci.center; });

        const height = VisConstants.horizontalBars.axis.height * 2 +
            VisConstants.horizontalBars.height * data.length;
        const width = 800;

        svg.attr('width', width).attr('height', height);

        const nameWidth = 100;

        const xMin = 0;
        const xMax = d3.max(data, d => d.ci.center);
        const xScale = d3.scaleLinear().domain([xMin, xMax]).range([nameWidth, width - VisConstants.padding]);
        const yScale = d3.scaleBand().domain(util.srange(data.length))
            .range([VisConstants.horizontalBars.axis.height,
                height - VisConstants.horizontalBars.axis.height])
            .padding(0.1);

        const topAxis = d3.axisTop(xScale);

        util.selectOrAppend(svg, 'g', '.x.axis.top')
            .attr('transform', util.translate(0, VisConstants.horizontalBars.axis.height))
            .transition()
            .call(topAxis as any);

        const labels = svg
            .selectAll('text.label')
            .data(data)

        let enter = labels.enter().append('text').attr('class', 'label')
            .style('text-anchor', 'end')
            .attr('font-size', '.8rem')
            .attr('dy', '.8rem')


        labels.merge(enter)
            .attr('transform', (d, i) => util.translate(nameWidth - VisConstants.padding, yScale(i+'')))
            .text(d => d.keys.list[0].valueString())

        labels.exit().remove();

        const bars = svg
            .selectAll('rect.bar')
            .data(data)

        enter = bars
            .enter()
            .append('rect')
            .attr('class', 'bar')

        bars.merge(enter)
            .attr('height', yScale.bandwidth())
            .attr('width', d => xScale(d.ci.center) - xScale(xMin))
            .attr('transform', (d, i) => util.translate(xScale(xMin), yScale(i+'')))
            .attr('fill', 'steelblue')

        bars.exit().remove();

        const bottomAxis = d3.axisBottom(xScale);

        util.selectOrAppend(svg, 'g', '.x.axis.bottom')
            .attr('transform', util.translate(0, height - VisConstants.horizontalBars.axis.height))
            .transition()
            .call(bottomAxis as any);

    }
}
