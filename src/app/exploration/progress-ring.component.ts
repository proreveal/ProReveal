import { Component, OnInit, Input, ElementRef, ViewChild, OnChanges } from '@angular/core';
import { Constants } from '../constants';
import * as d3 from 'd3';
import * as d3util from '../d3-utils/d3-utils';

@Component({
    selector: 'progress-ring',
    templateUrl: './progress-ring.component.html'
})
export class ProgressRingComponent implements OnInit, OnChanges {
    @Input() processed: number;
    @Input() ongoing: number;
    @ViewChild('svg', { static: true }) svg: ElementRef;

    private g;
    private percent;

    outerRadius = 28;
    constants = Constants;

    constructor() {
    }

    ngOnInit() {
        let svg = d3.select(this.svg.nativeElement);
        let g = svg.append('g');

        svg
            .attr('width', this.outerRadius * 2)
            .attr('height', this.outerRadius * 2)

        this.g = g;

        g
            .attr('transform', d3util.translate(this.outerRadius, this.outerRadius));

        this.percent = g.append('text')
            .attr('font-family', 'Roboto Condensed')
            .attr('text-anchor', 'middle')
            .attr('dy', '.33em')
            .attr('dx', '.1em')

        this.update();
    }

    ngOnChanges(changes) {
        if (this.g)
            this.update();
    }

    update() {
        let progress = this.processed;
        let ongoing = this.ongoing || 0;
        if (progress >= 1) {
            progress = 1;
            ongoing = 0;
        }

        if (progress + ongoing >= 1) {
            ongoing = 1 - progress;
        }

        let arc = d3.arc()
            .innerRadius(this.outerRadius - 5)
            .outerRadius(this.outerRadius);

        let pie = d3.pie().value((d: any) => d).sort(null)
        let data = pie([progress, ongoing, 1 - progress - ongoing]);
        let paths = this.g
            .selectAll('path')
            .data(data);

        let enter = paths
            .enter()
            .append('path')

        paths = paths.merge(enter);

        paths
            .attr('d', arc)
            .attr('fill', (d, i) => ['#007bff', '#a0ceff', '#ddd'][i]);

        this.percent.text(
            Math.round(progress * 1000) / 10 + '%'
        );

        if(progress === 0)
            this.percent.style('opacity', .3);
        else
            this.percent.style('opacity', 1);
    }
}
