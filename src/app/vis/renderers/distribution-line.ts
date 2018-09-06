import * as d3 from 'd3';
import { selectOrAppend } from '../../d3-utils/d3-utils';
import { Distribution, ConstantTrait } from '../../safeguard/constant';

type G = d3.Selection<d3.BaseType, {}, d3.BaseType, {}>;

export class DistributionLine {
    g: G;
    path: d3.Selection<d3.BaseType, {}, d3.BaseType, {}>;

    constructor() {
    }

    setup(g:G) {
        this.g = selectOrAppend(g as any, 'g', '.distribution-line-wrapper') as G;
    }

    render(n: number,
        x: d3.ScaleLinear<number, number>,
        y: d3.ScaleBand<string>,
        distribution: ConstantTrait & Distribution) {

        let data = d3.range(n);
        let line = d3.line<number>()
            .x(d => x(distribution.compute(d)))
            .y(d => y(d.toString()));

        let path = this.g.selectAll('path')
            .data([data]);

        path.exit().remove();

        path = path.enter().append('path')
            .style('fill', 'none')
            .style('stroke', 'black')
            .attr('pointer-events', 'none')
            .attr('stroke-width', '3px')
            .attr('opacity', .7)
            .attr('stroke-dasharray', 4)
            .merge(path)
                .attr('d', line)
    }

    show() {
        this.g.attr('display', 'inline');
    }

    hide() {
        this.g.attr('display', 'none');
    }

    on(event, handler) {
        // this.handlers[event] = handler;
    }
}
