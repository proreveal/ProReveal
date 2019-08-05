import { Component, OnInit, Input, ElementRef, ViewChild, OnChanges } from '@angular/core';
import { Constants } from '../constants';
import * as d3 from 'd3';
import * as d3util from '../d3-utils/d3-utils';

@Component({
    selector: 'progress-mini-ring',
    templateUrl: './progress-mini-ring.component.html'
})
export class ProgressMiniRingComponent implements OnInit {
    @Input() processed: number;
    @Input() ongoing: number;
    @ViewChild('svg', { static: true }) svg: ElementRef;

    private g;

    constants = Constants;
    outerRadius = 5;
    innerRadius = 2;

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
            .innerRadius(this.innerRadius)
            .outerRadius(this.outerRadius)

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
            .attr('fill', (d, i) => Constants.progressRingColors[i]);
    }
}
