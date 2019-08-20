import * as d3 from 'd3';
import { selectOrAppend } from '../../d3-utils/d3-utils';
import { LinearConstant } from '../../safeguard/constant';
import { NullGroupId } from '../../data/grouper';
import { FieldGroupedValue } from '../../data/field-grouped-value';

type G = d3.Selection<d3.BaseType, {}, d3.BaseType, {}>;
type Point = [number, number];

export class LinearLine {
    g: G;
    path: d3.Selection<d3.BaseType, {}, d3.BaseType, {}>;

    constructor() {
    }

    setup(g: G) {
        this.g = selectOrAppend(g as any, 'g', '.linear-line-wrapper') as G;
    }

    render(
        constant: LinearConstant,
        xKeyValues: { [hash: string]: FieldGroupedValue },
        yKeyValues: { [hash: string]: FieldGroupedValue },
        xScale: d3.ScaleBand<string>,
        yScale: d3.ScaleBand<string>,
    ) {
        let sortFunc = (a: FieldGroupedValue, b: FieldGroupedValue) => {
            let av = (a.value() as Point)[0];
            let bv = (b.value() as Point)[1];

            return av - bv;
        };

        let xBins = d3.values(xKeyValues).filter(d => d.groupId != NullGroupId).sort(sortFunc);
        let yBins = d3.values(yKeyValues).filter(d => d.groupId != NullGroupId).sort(sortFunc);

        let xDomain = [(xBins[0].value() as Point)[0], (xBins[xBins.length - 1].value() as Point)[1]] as Point;
        let yDomain = [(yBins[0].value() as Point)[0], (yBins[yBins.length - 1].value() as Point)[1]] as Point;
        let xRange = xScale.range();
        let yRange = yScale.range();
        let linearXScale = d3.scaleLinear().domain(xDomain).range(xRange);
        let linearYScale = d3.scaleLinear().domain(yDomain).range(yRange);

        let xValues = xBins.map(d => (d.value() as Point)[0]).concat(xDomain[1]);

        let points = xValues
            .map(x => {
                const y = constant.compute(x);

                return [linearXScale(x), linearYScale(y)] as Point;
            })
            .filter(p => {
                return yRange[0] <= p[1] && p[1] <= yRange[1];
            })

        let line = d3.line<Point>()
            .x(d => d[0])
            .y(d => d[1])
            .curve(d3.curveLinear);

        let path: any = this.g.selectAll('path')
            .data([points]);

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
