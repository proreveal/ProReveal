import * as d3 from 'd3';
import { selectOrAppend } from '../../d3-utils/d3-utils';
import { DistributionTrait, ConstantTrait } from '../../safeguard/constant';
import { Datum } from '../../data/datum';

type G = d3.Selection<d3.BaseType, {}, d3.BaseType, {}>;

export class DistributionLine {
    g: G;
    path: d3.Selection<d3.BaseType, {}, d3.BaseType, {}>;

    constructor() {
    }

    setup(g:G) {
        this.g = selectOrAppend(g as any, 'g', '.distribution-line-wrapper') as G;
    }

    render(
        distribution: ConstantTrait & DistributionTrait,
        data: Datum[],
        yGetter: (Datum, number) => [number, number],
        x: d3.ScaleLinear<number, number>,
        y: d3.ScaleBand<string>,
        ) {

        let filtered: [Datum, number][] = data.map((d, i) => [d, i] as [Datum, number])
            .filter(d => yGetter(d[0], d[1]) != null)
        let sum = filtered ? filtered.reduce((c, d) => c + d[0].ci3.center, 0) : 0;

        let line = d3.line<[Datum, number]>()
            .x(d => {
                let v = distribution.compute.apply(distribution, yGetter(d[0], d[1]));
                if(distribution.normalized) v *= sum;
                return x(v);
            })
            .y(d => y(d[1].toString()) + y.bandwidth() / 2)
            .curve(d3.curveBasis);

        let path = this.g.selectAll('path')
            .data([filtered]);

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

        //console.log(filtered)
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
