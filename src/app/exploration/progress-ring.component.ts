import { Component, OnInit, Input, ElementRef, ViewChild, OnChanges } from '@angular/core';
import { Constants } from '../constants';
import * as d3 from 'd3';

@Component({
    selector: 'progress-ring',
    templateUrl: './progress-ring.component.html',
    styleUrls: ['./progress-ring.component.scss']
})
export class ProgressRingComponent implements OnInit, OnChanges {
    @Input() processed: number;
    @Input() ongoing: number;
    @ViewChild('svg') svg: ElementRef;

    private g;

    constants = Constants;

    constructor() {
    }

    ngOnInit() {
        let svg = d3.select(this.svg.nativeElement);
        let g = svg.append('g');

        svg
            .attr('width', Constants.nodeWidth - Constants.nodeMargin * 2)
            .attr('height', Constants.nodeHeight - Constants.nodeMargin * 2)

        this.g = g;

        g
            .attr('transform', 'translate(' + (Constants.nodeWidth / 2 - Constants.nodeMargin) + ','
                + (Constants.nodeHeight / 2 - Constants.nodeMargin) + ')')

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
            .innerRadius(this.constants.nodeHeight / 2 - 5 - Constants.nodeMargin)
            .outerRadius(this.constants.nodeHeight / 2 - Constants.nodeMargin);

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
    }
}
