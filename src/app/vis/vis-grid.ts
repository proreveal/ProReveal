import * as d3 from 'd3';

export class VisGridSet {
    d3Svg: d3.Selection<any, {}, null, undefined>;
    d3XTitle: d3.Selection<any, {}, null, undefined>;
    d3XLabels: d3.Selection<any, {}, null, undefined>;
    d3YTitle: d3.Selection<any, {}, null, undefined>;
    d3YLabels: d3.Selection<any, {}, null, undefined>;
    d3VisGrid: d3.Selection<any, {}, null, undefined>;


    constructor(public svg:SVGSVGElement,
        public xTitle: SVGSVGElement,
        public xLabels: SVGSVGElement,
        public yTitle: SVGSVGElement,
        public yLabels: SVGSVGElement,
        public visGrid: HTMLDivElement) {
            this.d3Svg = d3.select(svg);
            this.d3XTitle = d3.select(xTitle);
            this.d3XLabels = d3.select(xLabels);
            this.d3YTitle = d3.select(yTitle);
            this.d3YLabels = d3.select(yLabels);
            this.d3VisGrid = d3.select(visGrid);
        }
}
