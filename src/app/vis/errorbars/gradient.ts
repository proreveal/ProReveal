import * as d3 from 'd3';
import { normalcdf } from './cdf';

export class Gradient {
    static GradientId = 0;

    static readonly StopPerOneSigma = 10;
    static readonly SigmaSpan = 3;
    static readonly Resolution = Gradient.StopPerOneSigma * Gradient.SigmaSpan;

    static readonly LeftGradientId = n => `leftGradient${n}`;
    static readonly RightGradientId = n => `rightGradient${n}`;

    id: number;

    constructor(public color:any = 'steelblue') {
        this.id = Gradient.GradientId++;
    }

    setup(g: d3.Selection<d3.BaseType, {}, SVGSVGElement, any>) {
        let cdf = normalcdf(0, 1);

        console.log(g);
        let left = g.append('linearGradient')
            .attr('id', Gradient.LeftGradientId(this.id))
            .attr('x1', '100%')
            .attr('x2', '0%')
            .attr('y1', '0%')
            .attr('y2', '0%') // Resolution / 3 sigma

        left
            .selectAll('stop')
            .data(d3.range(Gradient.Resolution + 1))
            .enter()
            .append('stop')
            .attr('offset', function (d) { return d / Gradient.Resolution * 100 + '%' })
            .style('stop-color', this.color)
            .style('stop-opacity', function (d) {
                let r = d / 10; // r sigma
                let p = 2 * (1 - cdf(r));
                let alpha = Math.min(1, p / 0.05);
                return alpha;
            })

        let right = g.append('linearGradient')
            .attr('id', Gradient.RightGradientId(this.id))
            .attr('x1', '0%')
            .attr('x2', '100%')
            .attr('y1', '0%')
            .attr('y2', '0%') // 3 sigma

        right
            .selectAll('stop')
            .data(d3.range(Gradient.Resolution + 1))
            .enter()
            .append('stop')
            .attr('offset', function (d) { return d / Gradient.Resolution * 100 + '%' })
            .style('stop-color', this.color)
            .style('stop-opacity', function (d) {
                let r = d / 10; // r sigma
                let p = 2 * (1 - cdf(r));
                let alpha = Math.min(1, p / 0.05);
                return alpha;
            })
    }

    leftId() {
        return Gradient.LeftGradientId(this.id);
    }

    rightId() {
        return Gradient.RightGradientId(this.id);
    }

    leftUrl() {
        return `url(#${this.leftId()})`;
    }

    rightUrl() {
        return `url(#${this.rightId()})`;
    }
}
