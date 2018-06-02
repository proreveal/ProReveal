import * as d3 from 'd3';
import { ExplorationNode } from '../../exploration/exploration-node';
import { VisConstants as VC } from '../vis-constants';
import * as util from '../../util';
import { AccumulatedResponseDictionary } from '../../data/accumulator';
import { AggregateQuery } from '../../data/query';
import { measure } from '../../d3-utils/measure';
import { translate, selectOrAppend } from '../../d3-utils/d3-utils';
import { Gradient } from '../errorbars/gradient';
import { FieldGroupedValueList, FieldGroupedValue } from '../../data/field';
import { ConfidenceInterval } from '../../data/approx';
import { Renderer } from './renderer';
import { TooltipComponent } from '../../tooltip/tooltip.component';
import { HorizontalBarsTooltipComponent } from './horizontal-bars-tooltip.component';

export class PunchcardRenderer extends Renderer {
    gradient = new Gradient();

    setup(node: ExplorationNode, nativeSvg: SVGSVGElement) {
        if ((node.query as AggregateQuery).groupBy.fields.length !== 2) {
            throw 'Punchcards can be used for 2 categories!';
        }

        this.gradient.setup(selectOrAppend(d3.select(nativeSvg), 'defs'));
    }

    render(node: ExplorationNode, nativeSvg: SVGSVGElement, tooltip: TooltipComponent) {
        let svg = d3.select(nativeSvg);
        let query = node.query as AggregateQuery;
        let processedPercent = query.progress.processedPercent();
        let done = query.progress.done();

        let data = query.resultList().map(
            value => {
                const ai = query.accumulator
                    .approximate(value[1], processedPercent);

                return {
                    id: value[0].hash,
                    keys: value[0],
                    ci3stdev: ai.range(3)
                };
            });

        let yKeys = {}, xKeys = {};
        let yKeyIndex = 0, xKeyIndex = 1;
        data.forEach(row => {
            yKeys[row.keys.list[0].hash] = row.keys.list[0];
            xKeys[row.keys.list[1].hash] = row.keys.list[1];
        });

        let xValues: FieldGroupedValue[] = Object.values(xKeys);
        let yValues: FieldGroupedValue[] = Object.values(yKeys);

        if (xValues.length > yValues.length)
            [yKeyIndex, xKeyIndex] = [xKeyIndex, yKeyIndex];

        xValues.sort(node.ordering(query.defaultOrderingGetter, query.defaultOrderingDirection));
        yValues.sort(node.ordering(query.defaultOrderingGetter, query.defaultOrderingDirection));


        let [, yLongest,] = util.amax(yValues, d => d.valueString().length);
        const yLabelWidth = yLongest ? measure(yLongest.valueString()).width : 0;

        let [, xLongest,] = util.amax(xValues, d => d.valueString().length);
        const xLabelWidth = xLongest ? measure(xLongest.valueString()).width : 0;
        const header = 1.414 / 2 * (VC.punchcard.columnWidth + xLabelWidth)
        const height = VC.punchcard.rowHeight * yValues.length + header;

        const width = yLabelWidth + VC.punchcard.columnWidth * (xValues.length - 1)
            + header;

        svg.attr('width', width).attr('height', height);

        // const xMin = (query as AggregateQuery).accumulator.alwaysNonNegative ? 0 : d3.min(data, d => d.ci3stdev.low);
        // const xMax = d3.max(data, d => d.ci3stdev.high);

        // const niceTicks = d3.ticks(xMin, xMax, 10);
        // const step = niceTicks[1] - niceTicks[0];
        // const domainStart = (query as AggregateQuery).accumulator.alwaysNonNegative ? Math.max(0, niceTicks[0] - step) : (niceTicks[0] - step);
        // const domainEnd = niceTicks[niceTicks.length - 1] + step;

        // if (node.domainStart > domainStart) node.domainStart = domainStart;
        // if (node.domainEnd < domainEnd) node.domainEnd = domainEnd;

        const xScale = d3.scaleBand().domain(util.srange(xValues.length))
            .range([yLabelWidth, width - header])
            .padding(0.1);

        const yScale = d3.scaleBand().domain(util.srange(yValues.length))
            .range([header, height])
            .padding(0.1);

        const yLabels = svg
            .selectAll('text.label.y')
            .data(yValues, (d:FieldGroupedValue) => d.hash);

        let enter:any = yLabels.enter().append('text').attr('class', 'label y')
            .style('text-anchor', 'end')
            .attr('font-size', '.8rem')
            .attr('dy', '.8rem')

        yLabels.merge(enter)
            .attr('transform', (d, i) => translate(yLabelWidth - VC.padding, yScale(i + '')))
            .text(d => d.valueString())

        yLabels.exit().remove();

        const xLabels = svg
            .selectAll('text.label.x')
            .data(xValues, (d:FieldGroupedValue) => d.hash);

        enter = xLabels.enter().append('text').attr('class', 'label x')
            .style('text-anchor', 'start')
            .attr('font-size', '.8rem')

        xLabels.merge(enter)
            .attr('transform', (d, i) => translate(xScale(i + '') + xScale.bandwidth() / 2, header - VC.padding) + 'rotate(-45)')
            .text(d => d.valueString())

        xLabels.exit().remove();

        const xLabelLines = svg.selectAll('line.label.x')
            .data(xValues, (d:FieldGroupedValue) => d.hash);

        enter = xLabelLines.enter().append('line').attr('class', 'label x')
            .style('stroke', 'black')
            .style('opacity', 0.2);

        xLabelLines.merge(enter)
            .attr('x1', (d, i) => xScale(i + '') + xScale.bandwidth() / 2)
            .attr('x2', (d, i) => xScale(i + '') + xScale.bandwidth() / 2)
            .attr('y1', yScale.range()[0])
            .attr('y2', yScale.range()[1])

        xLabelLines.exit().remove();

        const yLabelLines = svg.selectAll('line.label.y')
            .data(yValues, (d:FieldGroupedValue) => d.hash);

        enter = yLabelLines.enter().append('line').attr('class', 'label y')
            .style('stroke', 'black')
            .style('opacity', 0.2);

        yLabelLines.merge(enter)
            .attr('x1', xScale.range()[0])
            .attr('x2', xScale.range()[1])
            .attr('y1', (d, i) => yScale(i + '') + yScale.bandwidth() / 2)
            .attr('y2', (d, i) => yScale(i + '') + yScale.bandwidth() / 2)

        yLabelLines.exit().remove();

        // const topAxis = d3.axisTop(xScale).tickFormat(d3.format('~s'));

        // selectOrAppend(svg, 'g', '.x.axis.top')
        //     .attr('transform', translate(0, VC.horizontalBars.axis.height))
        //     .transition()
        //     .call(topAxis as any)

        // const labels = svg
        //     .selectAll('text.label')
        //     .data(data, (d: any) => d.id);

        // let enter = labels.enter().append('text').attr('class', 'label')
        //     .style('text-anchor', 'end')
        //     .attr('font-size', '.8rem')
        //     .attr('dy', '.8rem')

        // labels.merge(enter)
        //     .attr('transform', (d, i) => translate(labelWidth - VC.padding, yScale(i + '')))
        //     .text(d => d.keys.list[0].valueString())

        // labels.exit().remove();

        // const labelLines = svg.selectAll('line.label').data(data, (d: any) => d.id);

        // enter = labelLines.enter().append('line').attr('class', 'label')
        //     .style('stroke', 'black')
        //     .style('opacity', 0.2);

        // labelLines.merge(enter)
        //     .attr('x1', xScale.range()[0])
        //     .attr('x2', xScale.range()[1])
        //     .attr('y1', (d, i) => yScale(i + '') + yScale.bandwidth() / 2)
        //     .attr('y2', (d, i) => yScale(i + '') + yScale.bandwidth() / 2)

        // labelLines.exit().remove();

        // const leftBars = svg
        //     .selectAll('rect.left.bar')
        //     .data(data, (d: any) => d.id);

        // enter = leftBars
        //     .enter().append('rect').attr('class', 'left bar')

        // leftBars.merge(enter)
        //     .attr('height', yScale.bandwidth())
        //     .attr('width', d => xScale(d.ci3stdev.center) - xScale(d.ci3stdev.low))
        //     .attr('transform', (d, i) => translate(xScale(d.ci3stdev.low), yScale(i + '')))
        //     .attr('fill', this.gradient.leftUrl())

        // leftBars.exit().remove();

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
