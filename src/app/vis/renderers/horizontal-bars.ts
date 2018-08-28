import * as d3 from 'd3';
import { ExplorationNode } from '../../exploration/exploration-node';
import { VisConstants as VC, VisConstants } from '../vis-constants';
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
import { Safeguard, SafeguardTypes} from '../../safeguard/safeguard';
import { SingleVariable } from '../../safeguard/variable';
import { Operators } from '../../safeguard/operator';
import { VisComponent } from '../vis.component';
import { ScaleLinear } from 'd3';
import { Constant } from '../../safeguard/constant';

type Datum = {
    id: string,
    keys: FieldGroupedValueList,
    ci3stdev: ConfidenceInterval
};

export class HorizontalBarsRenderer implements Renderer {
    gradient = new Gradient();
    yScale: d3.ScaleBand<string>;
    data: Datum[];
    node: ExplorationNode;
    nativeSvg: SVGSVGElement;
    variable: SingleVariable;
    variable2: SingleVariable;
    labelWidth: number;
    width: number;

    brush: d3.BrushBehavior<Datum> = d3.brushX();

    labels: d3.Selection<d3.BaseType, Datum, d3.BaseType, {}>;
    eventBoxes: d3.Selection<d3.BaseType, Datum, d3.BaseType, {}>;
    variableHighlight: d3.Selection<d3.BaseType, {}, null, undefined>;
    variableHighlight2: d3.Selection<d3.BaseType, {}, null, undefined>;
    constantHighlight: d3.Selection<d3.BaseType, {}, d3.BaseType, {}>;
    brushG: d3.Selection<d3.BaseType, {}, d3.BaseType, {}>;
    brushLine: d3.Selection<d3.BaseType, {}, d3.BaseType, {}>;
    xScale: ScaleLinear<number, number>;

    constructor(public vis:VisComponent, public tooltip:TooltipComponent) {
    }

    setup(node: ExplorationNode, nativeSvg: SVGSVGElement) {
        if ((node.query as AggregateQuery).groupBy.fields.length > 1) {
            throw 'HorizontalBars can be used up to 1 groupBy';
        }

        let svg = d3.select(nativeSvg);

        this.gradient.setup(selectOrAppend(svg, 'defs'));
        selectOrAppend(svg, 'g', 'vis');

        this.node = node;
        this.nativeSvg = nativeSvg;
    }

    render(node: ExplorationNode, nativeSvg: SVGSVGElement) {
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

        svg.attr('width', width).attr('height', height)
            .on('contextmenu', () => d3.event.preventDefault());

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

        const xScale = d3.scaleLinear().domain([node.domainStart, node.domainEnd])
            .range([labelWidth, width - VC.padding])
            .clamp(true)
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

        const eventBoxes = visG.selectAll('rect.event-box')
            .data(data, (d: any) => d.id);

        let enter = eventBoxes.enter().append('rect').attr('class', 'event-box variable');

        this.eventBoxes = eventBoxes.merge(enter)
            .attr('height', yScale.bandwidth())
            .attr('width', width)
            .attr('transform', (d, i) => translate(0, yScale(i + '')))
            .style('pointer-events', 'none')

        eventBoxes.exit().remove();

        let labels = visG
            .selectAll('text.label')
            .data(data, (d: any) => d.id);

        enter = labels.enter().append('text').attr('class', 'label variable')
            .style('text-anchor', 'end')
            .attr('font-size', '.8rem')
            .attr('dy', '.8rem')

        this.labels = labels.merge(enter)
            .attr('transform', (d, i) => translate(labelWidth - VC.padding, yScale(i + '')))
            .text(d => d.keys.list[0].valueString())
            .on('mouseenter', (d, i) => {
                const clientRect = nativeSvg.getBoundingClientRect();
                const parentRect = nativeSvg.parentElement.getBoundingClientRect();

                this.tooltip.show(
                    clientRect.left - parentRect.left + xScale(d.ci3stdev.center),
                    clientRect.top - parentRect.top + yScale(i + ''),
                    HorizontalBarsTooltipComponent,
                    d
                );

                if([SafeguardTypes.Point, SafeguardTypes.Range].includes(this.creationMode))
                {
                    let ele = d3.select(this.eventBoxes.nodes()[i]);
                    ele.classed('highlighted', true)
                }
            })
            .on('mouseleave', (d, i) => {
                this.tooltip.hide();
                if([SafeguardTypes.Point, SafeguardTypes.Range].includes(this.creationMode))
                {
                    if(!this.variable || this.variable.fieldGroupedValue.hash
                        !== d.keys.list[0].hash) {
                        let ele = d3.select(this.eventBoxes.nodes()[i]);
                        ele.classed('highlighted', false)
                    }
                }
            })
            .on('click', (d, i) => {
                if([SafeguardTypes.Point, SafeguardTypes.Range].includes(this.creationMode))
                {
                    let variable = new SingleVariable(d.keys.list[0]);
                    this.variable = variable;
                    this.updateHighlight();

                    this.vis.variableSelected.emit({variable: variable});
                    this.vis.constantSelected.emit(d.ci3stdev.center);

                    this.constantUserChanged(d.ci3stdev.center);
                }
            })
            .on('contextmenu', (d, i) => {
                let variable = new SingleVariable(d.keys.list[0]);
                this.vis.variableSelected.emit({
                    variable: variable,
                    secondary: true});
                d3.event.preventDefault();
            })

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

        const bottomAxis = d3.axisBottom(xScale).tickFormat(d3.format('~s'));

        selectOrAppend(visG, 'g', '.x.axis.bottom')
            .attr('transform', translate(0, height - VC.horizontalBars.axis.height))
            .transition()
            .call(bottomAxis as any)

        this.variableHighlight =
            selectOrAppend(visG, 'rect', '.variable.highlighted')
            .attr('width', labelWidth)
            .attr('height', height - VC.horizontalBars.axis.height * 2)
            .attr('transform', translate(0, VC.horizontalBars.height))
            .attr('display', 'none')
            .style('pointer-events', 'none')

        this.variableHighlight2 =
            selectOrAppend(visG, 'rect', '.variable2.highlighted')
            .attr('width', labelWidth)
            .attr('height', height - VC.horizontalBars.axis.height * 2)
            .attr('transform', translate(0, VC.horizontalBars.height))
            .attr('display', 'none')
            .style('pointer-events', 'none')

        this.constantHighlight = selectOrAppend(visG, 'g', 'constant-highlight-wrapper')
            .attr('class', 'constant-highlight-wrapper')
            .style('opacity', 0)

        let selection = this.constantHighlight
            .selectAll('rect.constant.highlighted')
            .data([0, height - VC.horizontalBars.axis.height]);

        let enter2 = selection
            .enter()
            .append('rect')
            .attr('class', 'constant highlighted')
            .attr('width', width - labelWidth + VC.padding)
            .attr('height', VC.horizontalBars.axis.height)
            .attr('transform', d => translate(labelWidth - VC.padding, d))
            .on('click', (d, i) => {
                let x = xScale.invert(d3.event.offsetX);
                let step = d3.tickStep(xScale.domain()[0], xScale.domain()[1], 10) / 10;

                this.vis.constantSelected.emit(Math.round(x / step) * step);
            })
            .style('pointer-events', 'none')

        this.brush.extent([[labelWidth, VC.horizontalBars.axis.height],
            [width - VC.padding, height - VC.horizontalBars.axis.height]])
            .on('brush', () => {
                let sel = d3.event.selection;
                let center = (sel[0] + sel[1]) / 2;
                this.brushLine.attr('x1', center).attr('x2', center)
                this.vis.constantSelected.emit(xScale.invert(center));
            })

        this.brushG = selectOrAppend(visG, 'g', '.brush-wrapper')
            .call(this.brush);

        this.brushG.select('rect.selection').style('stroke-width', 0);

        this.brushLine = selectOrAppend(visG, 'line', '.brush-line')
            .attr('x1', labelWidth + 1)
            .attr('x2', labelWidth + 1)
            .attr('y1', VC.horizontalBars.axis.height)
            .attr('y2', height - VC.horizontalBars.axis.height)
            .attr('class', 'constant')
            .attr('display', 'none')
            .attr('pointer-events', 'none')

        this.labelWidth = labelWidth;
        this.width = width;
        this.xScale = xScale;
    }

    highlight(highlighted: number) {
        this.variableHighlight.attr('display', 'none')
        this.variableHighlight2.attr('display', 'none')
        this.constantHighlight.style('opacity', 0)

        if(highlighted == 1) {
            this.variableHighlight.attr('display', 'inline')
        }
        else if(highlighted == 2) {

        }
        else if(highlighted == 3) {
            // this.constantHighlight.style('opacity', 1)
        }
        else if(highlighted == 4) {
            this.variableHighlight2.attr('display', 'inline')
        }
    }

    creationMode: SafeguardTypes;
    setCreationMode(panel: SafeguardTypes) {
        this.creationMode = panel;
        if(panel == SafeguardTypes.None) {
            this.labels.style('cursor', 'auto');
        }
        else if(panel == SafeguardTypes.Point) {
            this.labels.style('cursor', 'pointer');

            this.brushG.selectAll('rect.overlay').attr('display', 'none');
            this.brushG.selectAll('rect.handle').attr('display', 'none');
            this.brushLine.attr('display', 'inline');

            let center = (this.width - this.labelWidth) / 2 + this.labelWidth;
            this.brushG.call(this.brush.move, [center - VC.pointBrushSize, center + VC.pointBrushSize]);
        }
    }

    updateHighlight() {
        this.eventBoxes
            .classed('highlighted', false)
            .filter((d, i) => this.variable && this.variable.fieldGroupedValue.hash === d.keys.list[0].hash)
            .classed('highlighted', true)

        console.log(this.labels)
        this.labels
            .classed('text-highlighted', false)
            .filter((d, i) => this.variable && this.variable.fieldGroupedValue.hash === d.keys.list[0].hash)
            .classed('text-highlighted', true)
    }

    constantUserChanged(constant: Constant) {
        let center = this.xScale(constant as number);
        this.brushG.call(this.brush.move, [center - VC.pointBrushSize, center + VC.pointBrushSize]);
    }
}
