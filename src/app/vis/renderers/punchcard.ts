import * as d3 from 'd3';
import { ExplorationNode } from '../../exploration/exploration-node';
import { VisConstants as VC } from '../vis-constants';
import * as util from '../../util';
import { AccumulatedResponseDictionary } from '../../data/accumulator';
import { AggregateQuery } from '../../data/query';
import { measure } from '../../d3-utils/measure';
import { translate, selectOrAppend } from '../../d3-utils/d3-utils';
import { FieldGroupedValueList, FieldGroupedValue } from '../../data/field';
import { ConfidenceInterval } from '../../data/approx';
import { Renderer } from './renderer';
import { TooltipComponent } from '../../tooltip/tooltip.component';
import { HorizontalBarsTooltipComponent } from './horizontal-bars-tooltip.component';
import * as vsup from 'vsup';

export class PunchcardRenderer extends Renderer {
    setup(node: ExplorationNode, nativeSvg: SVGSVGElement) {
        if ((node.query as AggregateQuery).groupBy.fields.length !== 2) {
            throw 'Punchcards can be used for 2 categories!';
        }
    }

    render(node: ExplorationNode, nativeSvg: SVGSVGElement, tooltip: TooltipComponent) {
        let svg = d3.select(nativeSvg);
        let query = node.query as AggregateQuery;
        let processedPercent = query.progress.processedPercent();
        let done = query.progress.done();

        console.log(vsup);
        let data = query.resultList().map(
            value => {
                const ai = query.accumulator
                    .approximate(value[1], processedPercent);

                return {
                    id: value[0].hash,
                    keys: value[0],
                    ci95: ai.ci95()
                };
            });

        let yKeys = {}, xKeys = {};
        let yKeyIndex = 0, xKeyIndex = 1;
        data.forEach(row => {
            yKeys[row.keys.list[0].hash] = row.keys.list[0];
            xKeys[row.keys.list[1].hash] = row.keys.list[1];
        });

        if (Object.values(xKeys).length > Object.values(yKeys).length)
            [yKeyIndex, xKeyIndex] = [xKeyIndex, yKeyIndex];

        let xValues: FieldGroupedValue[] = Object.values(xKeyIndex === 1 ? xKeys : yKeys);
        let yValues: FieldGroupedValue[] = Object.values(yKeyIndex === 0 ? yKeys : xKeys);

        xValues.sort(node.ordering(query.defaultOrderingGetter, query.defaultOrderingDirection));
        yValues.sort(node.ordering(query.defaultOrderingGetter, query.defaultOrderingDirection));

        let [, yLongest,] = util.amax(yValues, d => d.valueString().length);
        const yLabelWidth = yLongest ? measure(yLongest.valueString()).width : 0;

        let [, xLongest,] = util.amax(xValues, d => d.valueString().length);
        const xLabelWidth = xLongest ? measure(xLongest.valueString()).width : 0;
        const header = 1.414 / 2 * (VC.punchcard.columnWidth + xLabelWidth)
        const height = VC.punchcard.rowHeight * yValues.length + header;

        const width = yLabelWidth + VC.punchcard.columnWidth * (xValues.length - 1) + header;

        svg.attr('width', width).attr('height', height);

        // const xMin = (query as AggregateQuery).accumulator.alwaysNonNegative ? 0 : d3.min(data, d => d.ci3stdev.low);
        // const xMax = d3.max(data, d => d.ci3stdev.high);

        // const niceTicks = d3.ticks(xMin, xMax, 10);
        // const step = niceTicks[1] - niceTicks[0];
        // const domainStart = (query as AggregateQuery).accumulator.alwaysNonNegative ? Math.max(0, niceTicks[0] - step) : (niceTicks[0] - step);
        // const domainEnd = niceTicks[niceTicks.length - 1] + step;

        // if (node.domainStart > domainStart) node.domainStart = domainStart;
        // if (node.domainEnd < domainEnd) node.domainEnd = domainEnd;

        const xScale = d3.scaleBand().domain(xValues.map(d => d.hash))
            .range([yLabelWidth, width - header]);

        const yScale = d3.scaleBand().domain(yValues.map(d => d.hash))
            .range([header, height]);

        const yLabels = svg
            .selectAll('text.label.y')
            .data(yValues, (d: FieldGroupedValue) => d.hash);

        let enter: any = yLabels.enter().append('text').attr('class', 'label y')
            .style('text-anchor', 'end')
            .attr('font-size', '.8rem')
            .attr('dy', '.8rem')

        yLabels.merge(enter)
            .attr('transform', (d, i) => translate(yLabelWidth - VC.padding, yScale(d.hash)))
            .text(d => d.valueString())

        yLabels.exit().remove();

        const xLabels = svg
            .selectAll('text.label.x')
            .data(xValues, (d: FieldGroupedValue) => d.hash);

        enter = xLabels.enter().append('text').attr('class', 'label x')
            .style('text-anchor', 'start')
            .attr('font-size', '.8rem')

        xLabels.merge(enter)
            .attr('transform', (d, i) => translate(xScale(d.hash) + xScale.bandwidth() / 2, header - VC.padding) + 'rotate(-45)')
            .text(d => d.valueString())

        xLabels.exit().remove();

        const xLabelLines = svg.selectAll('line.label.x')
            .data(xValues, (d: FieldGroupedValue) => d.hash);

        enter = xLabelLines.enter().append('line').attr('class', 'label x')
            .style('stroke', 'black')
            .style('opacity', 0.2);

        xLabelLines.merge(enter)
            .attr('x1', (d, i) => xScale(d.hash) + xScale.bandwidth() / 2)
            .attr('x2', (d, i) => xScale(d.hash) + xScale.bandwidth() / 2)
            .attr('y1', yScale.range()[0])
            .attr('y2', yScale.range()[1])

        xLabelLines.exit().remove();

        const yLabelLines = svg.selectAll('line.label.y')
            .data(yValues, (d: FieldGroupedValue) => d.hash);

        enter = yLabelLines.enter().append('line').attr('class', 'label y')
            .style('stroke', 'black')
            .style('opacity', 0.2);

        yLabelLines.merge(enter)
            .attr('x1', xScale.range()[0])
            .attr('x2', xScale.range()[1])
            .attr('y1', (d, i) => yScale(d.hash) + yScale.bandwidth() / 2)
            .attr('y2', (d, i) => yScale(d.hash) + yScale.bandwidth() / 2)

        yLabelLines.exit().remove();

        const rects = svg
            .selectAll('rect.area')
            .data(data, (d: any) => d.id);

        enter = rects
            .enter().append('rect').attr('class', 'area')

        let quant = vsup.quantization().branching(2).layers(4)
            .valueDomain([0, d3.max(data, d => d.ci95.center)])
            .uncertaintyDomain([0, d3.max(data, d => d.ci95.high - d.ci95.center)]);

        let zScale = vsup.scale().quantize(quant).range(d3.interpolateViridis);

        rects.merge(enter)
            .attr('height', yScale.bandwidth())
            .attr('width', xScale.bandwidth())
            .attr('transform', (d, i) => {
                return translate(xScale(d.keys.list[xKeyIndex].hash), yScale(d.keys.list[yKeyIndex].hash))
            })
            .attr('fill', d => zScale(d.ci95.center, d.ci95.high - d.ci95.center));

        rects.exit().remove();

        // const rightBars = svg
        //     .selectAll('rect.right.bar')
        //     .data(data, (d: any) => d.id);

        // enter = rightBars
        //     .enter().append('rect').attr('class', 'right bar')

        // rightBars.merge(enter)
        //     .attr('height', yScale.bandwidth())
        //     .attr('width', d => xScale(d.ci3stdev.high) - xScale(d.ci3stdev.center))
        //     .attr('transform', (d, i) => translate(xScale(d.ci3stdev.center), yScale(i + '')))
        //     .attr('fill', this.gradient.rightUrl())

        // rightBars.exit().remove();

        // const centerLines = svg
        //     .selectAll('line.center')
        //     .data(data, (d: any) => d.id);

        // enter = centerLines
        //     .enter().append('line').attr('class', 'center')

        // centerLines.merge(enter)
        //     .attr('x1', (d, i) => xScale(d.ci3stdev.center))
        //     .attr('y1', (d, i) => yScale(i + ''))
        //     .attr('x2', (d, i) => xScale(d.ci3stdev.center))
        //     .attr('y2', (d, i) => yScale(i + '') + yScale.bandwidth())
        //     .style('stroke-width', done ? 2 : 1)
        //     .style('stroke', 'black')
        //     .style('shape-rendering', 'crispEdges')

        // centerLines.exit().remove();

        // if (done) {
        //     const circles = svg.selectAll('circle')
        //         .data(data, (d: any) => d.id);

        //     enter = circles.enter().append('circle')
        //         .attr('r', VC.horizontalBars.circleRadius)
        //         .attr('fill', 'steelblue')

        //     circles.merge(enter)
        //         .attr('cx', d => xScale(d.ci3stdev.center))
        //         .attr('cy', (d, i) => yScale(i + '') + yScale.bandwidth() / 2);

        //     circles.exit().remove();
        // }
        // else {
        //     svg.selectAll('circle')
        //         .remove();
        // }

        // const eventBoxes = svg.selectAll('rect.event-box')
        //     .data(data, (d: any) => d.id);

        // enter = eventBoxes.enter().append('rect').attr('class', 'event-box');

        // eventBoxes.merge(enter)
        //     .style('fill', 'transparent')
        //     .attr('height', yScale.bandwidth())
        //     .attr('width', width)
        //     .attr('transform', (d, i) => translate(0, yScale(i + '')))
        //     .on('mouseover', (d, i) => {
        //         const clientRect = nativeSvg.getBoundingClientRect();
        //         tooltip.show(
        //             clientRect.left + xScale(d.ci3stdev.center),
        //             clientRect.top + yScale(i + ''),
        //             HorizontalBarsTooltipComponent,
        //             d
        //         );
        //     })
        //     .on('mouseout', (d, i) => {
        //         tooltip.hide();
        //     })

        // eventBoxes.exit().remove();

        // const bottomAxis = d3.axisBottom(xScale).tickFormat(d3.format('~s'));

        // selectOrAppend(svg, 'g', '.x.axis.bottom')
        //     .attr('transform', translate(0, height - VC.horizontalBars.axis.height))
        //     .transition()
        //     .call(bottomAxis as any)
    }
}
