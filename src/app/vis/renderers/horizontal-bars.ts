import * as d3 from 'd3';
import { ExplorationNode } from '../../exploration/exploration-node';
import { VisConstants as VC } from '../vis-constants';
import * as util from '../../util';
import { AggregateQuery } from '../../data/query';
import { measure } from '../../d3-utils/measure';
import { translate, selectOrAppend } from '../../d3-utils/d3-utils';
import { Gradient } from '../errorbars/gradient';
import { FieldGroupedValueList } from '../../data/field';
import { ConfidenceInterval } from '../../data/approx';
import { Renderer } from './renderer';
import { TooltipComponent } from '../../tooltip/tooltip.component';
import { HorizontalBarsTooltipComponent } from './horizontal-bars-tooltip.component';
import { Sketchable } from './sketchable';
import { HandwritingRecognitionService, HandWriting } from '../../handwriting-recognition.service';
import { Safeguard } from '../../safeguard/safeguard';
import { SingleValueVariable } from '../../safeguard/variable';
import { Operators } from '../../safeguard/operator';

type Datum = {
    id: string,
    keys: FieldGroupedValueList,
    ci3stdev: ConfidenceInterval
};

export class HorizontalBarsRenderer implements Renderer {
    gradient = new Gradient();
    sketchable:Sketchable;
    yScale: d3.ScaleBand<string>;
    data: Datum[];
    node: ExplorationNode;

    constructor(private handwritingRecognitionService: HandwritingRecognitionService) {
        this.sketchable = new Sketchable(handwritingRecognitionService);
    }

    setup(node: ExplorationNode, nativeSvg: SVGSVGElement, tooltip: TooltipComponent) {
        if ((node.query as AggregateQuery).groupBy.fields.length > 1) {
            throw 'HorizontalBars can be used up to 1 groupBy';
        }

        let svg = d3.select(nativeSvg);

        this.gradient.setup(selectOrAppend(svg, 'defs'));
        selectOrAppend(svg, 'g', 'vis');
        this.sketchable.setup(svg)
            .on('start', () => {
                tooltip.hide();
            })

        this.node = node;
    }

    render(node: ExplorationNode, nativeSvg: SVGSVGElement, tooltip: TooltipComponent) {
        let svg = d3.select(nativeSvg);
        let query = node.query as AggregateQuery;
        let processedPercent = query.progress.processedPercent();
        let done = query.progress.done();
        let visG = svg.select('g.vis');

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

        data.sort(node.ordering(query.defaultOrderingGetter, query.defaultOrderingDirection));
        this.data = data;

        const height = VC.horizontalBars.axis.height * 2 +
            VC.horizontalBars.height * data.length;
        const width = 800;

        svg.attr('width', width).attr('height', height);

        let [, longest,] = util.amax(data, d => d.keys.list[0].valueString().length);
        const labelWidth = longest ? measure(longest.keys.list[0].valueString()).width : 0;

        const xMin = (query as AggregateQuery).accumulator.alwaysNonNegative ? 0 : d3.min(data, d => d.ci3stdev.low);
        const xMax = d3.max(data, d => d.ci3stdev.high);

        const niceTicks = d3.ticks(xMin, xMax, 10);
        const step = niceTicks[1] - niceTicks[0];
        const domainStart = (query as AggregateQuery).accumulator.alwaysNonNegative ? Math.max(0, niceTicks[0] - step) : (niceTicks[0] - step);
        const domainEnd = niceTicks[niceTicks.length - 1] + step;

        if (node.domainStart > domainStart) node.domainStart = domainStart;
        if (node.domainEnd < domainEnd) node.domainEnd = domainEnd;

        const xScale = d3.scaleLinear().domain([node.domainStart, node.domainEnd]).range([labelWidth, width - VC.padding]);
        const yScale = d3.scaleBand().domain(util.srange(data.length))
            .range([VC.horizontalBars.axis.height,
            height - VC.horizontalBars.axis.height])
            .padding(0.1);

        this.yScale = yScale;

        const majorTickLines = d3.axisTop(xScale).tickSize(-(height - 2 * VC.horizontalBars.axis.height));

        selectOrAppend(visG, 'g', '.sub.axis')
            .style('opacity', .2)
            .attr('transform', translate(0, VC.horizontalBars.axis.height))
            .transition()
            .call(majorTickLines as any)
            .selectAll('text')
            .style('display', 'none')

        const topAxis = d3.axisTop(xScale).tickFormat(d3.format('~s'));

        selectOrAppend(visG, 'g', '.x.axis.top')
            .attr('transform', translate(0, VC.horizontalBars.axis.height))
            .transition()
            .call(topAxis as any)

        const labels = visG
            .selectAll('text.label')
            .data(data, (d: any) => d.id);

        let enter = labels.enter().append('text').attr('class', 'label')
            .style('text-anchor', 'end')
            .attr('font-size', '.8rem')
            .attr('dy', '.8rem')

        labels.merge(enter)
            .attr('transform', (d, i) => translate(labelWidth - VC.padding, yScale(i + '')))
            .text(d => d.keys.list[0].valueString())

        labels.exit().remove();

        const labelLines = visG.selectAll('line.label').data(data, (d: any) => d.id);

        enter = labelLines.enter().append('line').attr('class', 'label')
            .style('stroke', 'black')
            .style('opacity', 0.2);

        labelLines.merge(enter)
            .attr('x1', xScale.range()[0])
            .attr('x2', xScale.range()[1])
            .attr('y1', (d, i) => yScale(i + '') + yScale.bandwidth() / 2)
            .attr('y2', (d, i) => yScale(i + '') + yScale.bandwidth() / 2)

        labelLines.exit().remove();

        const leftBars = visG
            .selectAll('rect.left.bar')
            .data(data, (d: any) => d.id);

        enter = leftBars
            .enter().append('rect').attr('class', 'left bar')

        leftBars.merge(enter)
            .attr('height', yScale.bandwidth())
            .attr('width', d => xScale(d.ci3stdev.center) - xScale(d.ci3stdev.low))
            .attr('transform', (d, i) => translate(xScale(d.ci3stdev.low), yScale(i + '')))
            .attr('fill', this.gradient.leftUrl())

        leftBars.exit().remove();

        const rightBars = visG
            .selectAll('rect.right.bar')
            .data(data, (d: any) => d.id);

        enter = rightBars
            .enter().append('rect').attr('class', 'right bar')

        rightBars.merge(enter)
            .attr('height', yScale.bandwidth())
            .attr('width', d => xScale(d.ci3stdev.high) - xScale(d.ci3stdev.center))
            .attr('transform', (d, i) => translate(xScale(d.ci3stdev.center), yScale(i + '')))
            .attr('fill', this.gradient.rightUrl())

        rightBars.exit().remove();

        const centerLines = visG
            .selectAll('line.center')
            .data(data, (d: any) => d.id);

        enter = centerLines
            .enter().append('line').attr('class', 'center')

        centerLines.merge(enter)
            .attr('x1', (d, i) => xScale(d.ci3stdev.center))
            .attr('y1', (d, i) => yScale(i + ''))
            .attr('x2', (d, i) => xScale(d.ci3stdev.center))
            .attr('y2', (d, i) => yScale(i + '') + yScale.bandwidth())
            .style('stroke-width', done ? 2 : 1)
            .style('stroke', 'black')
            .style('shape-rendering', 'crispEdges')

        centerLines.exit().remove();

        if (done) {
            const circles = visG.selectAll('circle')
                .data(data, (d: any) => d.id);

            enter = circles.enter().append('circle')
                .attr('r', VC.horizontalBars.circleRadius)
                .attr('fill', 'steelblue')

            circles.merge(enter)
                .attr('cx', d => xScale(d.ci3stdev.center))
                .attr('cy', (d, i) => yScale(i + '') + yScale.bandwidth() / 2);

            circles.exit().remove();
        }
        else {
            visG.selectAll('circle')
                .remove();
        }

        const eventBoxes = visG.selectAll('rect.event-box')
            .data(data, (d: any) => d.id);

        enter = eventBoxes.enter().append('rect').attr('class', 'event-box');

        eventBoxes.merge(enter)
            .style('fill', 'transparent')
            .attr('height', yScale.bandwidth())
            .attr('width', width)
            .attr('transform', (d, i) => translate(0, yScale(i + '')))
            .on('mouseover', (d, i) => {
                if(this.sketchable.sketching) return;
                const clientRect = nativeSvg.getBoundingClientRect();
                tooltip.show(
                    clientRect.left + xScale(d.ci3stdev.center),
                    clientRect.top + yScale(i + ''),
                    HorizontalBarsTooltipComponent,
                    d
                );
            })
            .on('mouseout', (d, i) => {
                tooltip.hide();
            })

        eventBoxes.exit().remove();

        const bottomAxis = d3.axisBottom(xScale).tickFormat(d3.format('~s'));

        selectOrAppend(visG, 'g', '.x.axis.bottom')
            .attr('transform', translate(0, height - VC.horizontalBars.axis.height))
            .transition()
            .call(bottomAxis as any)
    }

    recognitionRequested() {
        return this.sketchable.recognize()
            .toPromise()
            .then(this.translate.bind(this));
    }

    translate(handwriting:HandWriting) {
        let box = this.sketchable.getBoundingBox();
        let yCenter = box.y + box.height / 2;
        let yScale = this.yScale;
        let minDist = Infinity, minIndex = 0;

        yScale.domain().forEach((value, index) => {
            let y = yScale(value) + yScale.bandwidth() / 2;
            let dist = Math.abs(yCenter - y);
            if(dist < minDist)
            {
                minDist = dist;
                minIndex = index;
            }
        });

        let closestDatum = this.data[minIndex];

        if(handwriting.expressions.length === 0) return;
        let first = handwriting.expressions[0];
        let resultSg:Safeguard = null;

        if(first.type === '<' && first.operands[1].type === 'number') {
            let sg = new Safeguard(
                new SingleValueVariable(closestDatum.keys),
                Operators.LessThan,
                first.operands[1].value,
                this.node
            );
            resultSg = sg;
        }

        console.log(handwriting);
        console.log(this.data[minIndex]);

        if(resultSg) {
            this.sketchable.empty();
            this.sketchable.renderStrokes();
        }

        return resultSg;
    }

    clearRequested() {
        this.sketchable.empty();
        this.sketchable.renderStrokes();
    }
}
