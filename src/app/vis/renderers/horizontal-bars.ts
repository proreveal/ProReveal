import * as d3 from 'd3';
import { Constants as C } from '../../constants';
import * as util from '../../util';
import { measure } from '../../d3-utils/measure';
import { translate, selectOrAppend } from '../../d3-utils/d3-utils';
import { Gradient } from '../errorbars/gradient';
import { TooltipComponent } from '../../tooltip/tooltip.component';
import { HorizontalBarsTooltipComponent } from './horizontal-bars-tooltip.component';
import { SafeguardTypes as SGT, DistributiveSafeguardTypes } from '../../safeguard/safeguard';
import { SingleVariable, VariableTypes as VT } from '../../safeguard/variable';
import { VisComponent } from '../vis.component';
import { ScaleLinear } from 'd3';
import { ConstantTrait, PointRankConstant, PointValueConstant, RangeRankConstant, RangeValueConstant, PowerLawConstant, DistributionTrait, NormalConstant } from '../../safeguard/constant';
import { FlexBrush, FlexBrushDirection, FlexBrushMode } from './brush';
import { DistributionLine } from './distribution-line';
import { AndPredicate } from '../../data/predicate';
import { Datum } from '../../data/datum';
import { EmptyConfidenceInterval } from '../../data/approx';
import { AggregateQuery } from '../../data/query';

export class HorizontalBarsRenderer {
    gradient = new Gradient();
    xScale: ScaleLinear<number, number>;
    yScale: d3.ScaleBand<string>;
    data: Datum[];
    query: AggregateQuery;
    nativeSvg: SVGSVGElement;
    variable1: SingleVariable;
    variable2: SingleVariable;
    labelWidth: number;
    width: number;
    height: number;
    flexBrush = new FlexBrush<Datum>();
    distributionLine = new DistributionLine();

    labels: d3.Selection<d3.BaseType, Datum, d3.BaseType, {}>;
    ranks: d3.Selection<d3.BaseType, Datum, d3.BaseType, {}>;
    eventBoxes: d3.Selection<d3.BaseType, Datum, d3.BaseType, {}>;
    variableHighlight: d3.Selection<d3.BaseType, {}, null, undefined>;
    variableHighlight2: d3.Selection<d3.BaseType, {}, null, undefined>;
    constantHighlight1: d3.Selection<d3.BaseType, {}, d3.BaseType, {}>;
    constantHighlight2: d3.Selection<d3.BaseType, {}, d3.BaseType, {}>;

    limitNumCategories = true;

    visG;
    interactionG;

    constructor(public vis: VisComponent, public tooltip: TooltipComponent) {
    }

    setup(query: AggregateQuery, nativeSvg: SVGSVGElement, floatingSvg: HTMLDivElement) {
        if (query.groupBy.fields.length > 1) {
            throw 'HorizontalBars can be used up to 1 groupBy';
        }

        let svg = d3.select(nativeSvg);

        this.gradient.setup(selectOrAppend(svg, 'defs'));
        this.visG = selectOrAppend(svg, 'g', 'vis');

        this.visG.classed('horizontal-bars', true);
        this.query = query;
        this.nativeSvg = nativeSvg;

        this.interactionG = selectOrAppend(svg, 'g', 'interaction');
        this.flexBrush.setup(this.interactionG);
        this.distributionLine.setup(this.interactionG);
    }

    render(query: AggregateQuery, nativeSvg: SVGSVGElement, floatingSvg: HTMLDivElement) {
        let svg = d3.select(nativeSvg);
        let done = query.visibleProgress.done();
        let visG = svg.select('g.vis');
        let data = query.getVisibleData();

        this.data = data;

        if (this.limitNumCategories) {
            data = data.slice(0, C.horizontalBars.initiallyVisibleCategories);
        }

        const height = C.horizontalBars.axis.height * 2 +
            C.horizontalBars.height * data.length + C.horizontalBars.label.height * 2;
        const width = 800;

        svg.attr('width', width).attr('height', height)
            .on('contextmenu', () => d3.event.preventDefault());

        let [, longest,] = util.amax(data, d => d.keys.list[0].valueString().length);
        const labelWidth =
            Math.max(longest ? (measure(longest.keys.list[0].valueString(), '.8rem').width
                + (query.isRankAvailable ? 20 : 0)) : 0 + C.padding,
                measure(query.groupBy.fields[0].name, '.8rem').width + (query.isRankAvailable ? 20 : 0)
                + C.padding
            );

        this.labelWidth = labelWidth;
        this.width = width;
        this.height = height;

        const xMin = query.approximator.alwaysNonNegative ? 0 : d3.min(data, d => d.ci3.low);
        const xMax = d3.max(data, d => d.ci3.high);

        const niceTicks = d3.ticks(xMin, xMax, 10);
        const step = niceTicks[1] - niceTicks[0];
        const domainStart = query.approximator.alwaysNonNegative ? Math.max(0, niceTicks[0] - step) : (niceTicks[0] - step);
        const domainEnd = niceTicks[niceTicks.length - 1] + step;

        if (query.domainStart > domainStart) query.domainStart = domainStart;
        if (query.domainEnd < domainEnd) query.domainEnd = domainEnd;

        const xScale = d3.scaleLinear().domain([query.domainStart, query.domainEnd])
            .range([labelWidth, width - C.padding])
            .clamp(true)

        const yScale = d3.scaleBand().domain(util.srange(data.length))
            .range([C.horizontalBars.axis.height + C.horizontalBars.label.height,
            height - C.horizontalBars.axis.height - C.horizontalBars.label.height])
            .padding(0.1);

        this.yScale = yScale;

        const majorTickLines = d3.axisTop(xScale).tickSize(-(height - 2 * C.horizontalBars.axis.height - 2 * C.horizontalBars.label.height));

        // render top and bottom labels
        {
            // x labels
            selectOrAppend(visG, 'text', '.x.field.label.top')
                .text(query.target ? query.target.name : 'Count')
                .attr('transform', translate((width - labelWidth - C.padding) / 2 + labelWidth, 0))
                .style('text-anchor', 'middle')
                .attr('dy', '.8em')
                .style('font-size', '.8em')
                .style('font-style', 'italic')

            selectOrAppend(visG, 'text', '.x.field.label.bottom')
                .text(query.target ? query.target.name : 'Count')
                .attr('transform', translate((width - labelWidth - C.padding) / 2 + labelWidth, height - C.horizontalBars.axis.height))
                .style('text-anchor', 'middle')
                .attr('dy', '1.3em')
                .style('font-size', '.8em')
                .style('font-style', 'italic')

            // y labels
            selectOrAppend(visG, 'text', '.y.field.label')
                .text(query.groupBy.fields[0].name)
                .attr('transform', translate(labelWidth - C.padding, C.horizontalBars.label.height))
                .style('text-anchor', 'end')
                .attr('dy', '1.2em')
                .style('font-size', '.8rem')
                .style('font-style', 'italic')
        }

        // render major ticks
        {
            selectOrAppend(visG, 'g', '.sub.axis')
                .style('opacity', .2)
                .attr('transform', translate(0, C.horizontalBars.axis.height + C.horizontalBars.label.height))
                .transition()
                .call(majorTickLines as any)
                .selectAll('text')
                .style('display', 'none')
        }

        // render the top axis
        {
            const topAxis = d3.axisTop(xScale).tickFormat(d3.format('~s'));

            selectOrAppend(visG, 'g', '.x.axis.top')
                .attr('transform', translate(0, C.horizontalBars.axis.height + C.horizontalBars.label.height))
                .transition()
                .call(topAxis as any)
        }

        let enter: any;

        // render event boxes (for highlight)
        {
            const eventBoxes = visG.selectAll('rect.event-box')
                .data(data, (d: any) => d.id);

            enter = eventBoxes.enter().append('rect').attr('class', 'event-box variable1');

            this.eventBoxes = eventBoxes.merge(enter)
                .attr('height', yScale.bandwidth())
                .attr('width', width)
                .attr('class', 'event-box variable1')
                .attr('transform', (d, i) => translate(0, yScale(i + '')))
                .style('pointer-events', 'none')

            eventBoxes.exit().remove();
        }

        // render ranks
        if (query.isRankAvailable) {
            let background = visG.selectAll('rect.alternate')
                .data(data, (d: any) => d.id);

            enter = background.enter().append('rect').attr('class', 'alternate')

            background.merge(enter)
                .attr('height', yScale.bandwidth() * (1 + yScale.padding() / 2))
                .attr('width', labelWidth)
                .attr('transform', (d, i) => translate(0, yScale(i + '')))
                .attr('fill', 'black')
                .style('opacity', (d, i) => !d.keys.hasNullValue() && i % 2 ? 0.08 : 0);

            background.exit().remove();

            let ranks = visG
                .selectAll('text.rank')
                .data(data, (d: any) => d.id);

            enter = ranks.enter().append('text').attr('class', 'rank variable1')
                .attr('font-size', '.8rem')
                .attr('dy', '.8rem')
                .style('user-select', 'none')

            this.ranks = ranks.merge(enter)
                .attr('transform', (d, i) => translate(0, yScale(i + '')))
                .text((d, i) => `${i + 1}`)
                .style('opacity', d => {
                    if (d.keys.hasNullValue()) return 0;
                    return 0.5;
                })

            ranks.exit().remove();
        }

        // render labels
        {
            let labels = visG
                .selectAll('text.y.data.label')
                .data(data, (d: any) => d.id);

            enter = labels.enter().append('text').attr('class', 'label y data variable1')
                .style('text-anchor', 'end')
                .attr('font-size', '.8rem')
                .attr('dy', '.8rem')
                .style('user-select', 'none')

            this.labels = labels.merge(enter)
                .attr('transform', (d, i) => translate(labelWidth - C.padding, yScale(i + '')))
                .text((d) => `${d.keys.list[0].valueString()}`)
                .style('opacity', d => {
                    if (d.keys.hasNullValue()) return 0.6;
                    return 1;
                })
                .style('cursor', 'pointer')
                .on('mouseenter', (d, i, ele) => {
                    this.showTooltip(d, i);
                    d3.select(ele[i]).classed('hover-highlighted', true);
                })
                .on('mouseleave', (d, i, ele) => {
                    this.hideTooltip(d, i);
                    d3.select(ele[i]).classed('hover-highlighted', false);
                })
                .on('click', (d, i, ele) => {
                    this.datumSelected(d);
                    this.toggleDropdown(d, i);

                    let d3ele = d3.select(ele[i]);
                    d3ele.classed('menu-open-highlighted', this.vis.selectedDatum === d);
                })
                .on('contextmenu', (d) => this.datumSelected2(d))

            labels.exit().remove();
        }

        // render label lines
        {
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
        }

        // render left gradient bars
        {
            const leftBars = visG
                .selectAll('rect.left.bar')
                .data(data, (d: any) => d.id);

            enter = leftBars
                .enter().append('rect').attr('class', 'left bar')

            leftBars.merge(enter)
                .attr('height', yScale.bandwidth())
                .attr('width', d => xScale(d.ci3.center) - xScale(d.ci3.low))
                .attr('transform', (d, i) => {
                    return translate(xScale(d.ci3.low), yScale(i + ''))
                })
                .attr('fill', this.gradient.leftUrl())
                .style('opacity', d => {
                    if (d.keys.hasNullValue()) return 0.6;
                    return 1;
                })

            leftBars.exit().remove();
        }

        // render right gradient bars
        {
            const rightBars = visG
                .selectAll('rect.right.bar')
                .data(data, (d: any) => d.id);

            enter = rightBars
                .enter().append('rect').attr('class', 'right bar')

            rightBars.merge(enter)
                .attr('height', yScale.bandwidth())
                .attr('width', d => xScale(d.ci3.high) - xScale(d.ci3.center))
                .attr('transform', (d, i) => translate(xScale(d.ci3.center), yScale(i + '')))
                .attr('fill', this.gradient.rightUrl())
                .style('opacity', d => {
                    if (d.keys.hasNullValue()) return 0.6;
                    return 1;
                })

            rightBars.exit().remove();
        }

        // render center lines
        {
            const centerLines = visG
                .selectAll('line.center')
                .data(data, (d: any) => d.id);

            enter = centerLines
                .enter().append('line').attr('class', 'center')

            centerLines.merge(enter)
                .attr('x1', (d) => xScale(d.ci3.center))
                .attr('y1', (d, i) => yScale(i + ''))
                .attr('x2', (d) => xScale(d.ci3.center))
                .attr('y2', (d, i) => yScale(i + '') + yScale.bandwidth())
                .style('stroke-width', done ? 2 : 1)
                .style('stroke', 'black')
                .style('shape-rendering', 'crispEdges')
                .style('opacity', d => {
                    if (d.keys.hasNullValue()) return 0.3;
                    return 1;
                })

            centerLines.exit().remove();
        }

        // render circles when done
        if (done) {
            const circles = visG.selectAll('circle')
                .data(data, (d: any) => d.id);

            enter = circles.enter().append('circle')
                .attr('r', C.horizontalBars.circleRadius)
                .attr('fill', 'steelblue')
                .style('pointer-events', 'none')

            circles.merge(enter)
                .attr('cx', d => xScale(d.ci3.center))
                .attr('cy', (d, i) => yScale(i + '') + yScale.bandwidth() / 2)
                .style('opacity', d => {
                    if (d.keys.hasNullValue()) return 0.6;
                    return 1;
                })

            circles.exit().remove();
        }
        else {
            visG.selectAll('circle')
                .remove();
        }

        // render bar event boxes (tooltip when hovered)
        {
            const barEventBoxes = visG.selectAll('rect.bar-event-box')
                .data(data, (d: any) => d.id);

            enter = barEventBoxes
                .enter().append('rect').attr('class', 'bar-event-box');

            barEventBoxes.merge(enter)
                .attr('height', yScale.bandwidth())
                .attr('width', d => xScale(d.ci3.high) - xScale(d.ci3.low))
                .attr('transform', (d, i) => translate(xScale(d.ci3.low), yScale(i + '')))
                .style('fill', 'transparent')
                .on('mouseenter', (d, i) => { this.showTooltip(d, i); })
                .on('mouseleave', (d, i) => { this.hideTooltip(d, i); })

            barEventBoxes.exit().remove();
        }

        // render the bottom axis
        {
            const bottomAxis = d3.axisBottom(xScale).tickFormat(d3.format('~s'));

            selectOrAppend(visG, 'g', '.x.axis.bottom')
                .attr('transform', translate(0, height - C.horizontalBars.axis.height - C.horizontalBars.label.height))
                .transition()
                .call(bottomAxis as any)
        }

        d3.select(floatingSvg).style('display', 'none');

        // highlights
        {
            this.variableHighlight =
                selectOrAppend(visG, 'rect', '.variable1.highlighted')
                    .attr('width', labelWidth)
                    .attr('height', height - C.horizontalBars.axis.height * 2)
                    .attr('transform', translate(0, C.horizontalBars.height))
                    .style('display', 'none')
                    .style('pointer-events', 'none')

            this.variableHighlight2 =
                selectOrAppend(visG, 'rect', '.variable2.highlighted')
                    .attr('width', labelWidth)
                    .attr('height', height - C.horizontalBars.axis.height * 2)
                    .attr('transform', translate(0, C.horizontalBars.height))
                    .style('display', 'none')
                    .style('pointer-events', 'none')

            this.constantHighlight1 = selectOrAppend(visG, 'rect', '.constant.highlighted.highlight-top')
                .attr('width', width - C.padding - labelWidth)
                .attr('height', C.horizontalBars.axis.height)
                .attr('transform', translate(labelWidth, 0))
                .style('display', 'none')
                .style('pointer-events', 'none')

            this.constantHighlight2 = selectOrAppend(visG, 'rect', '.constant.highlighted.highlight-bottom')
                .attr('width', width - C.padding - labelWidth)
                .attr('height', C.horizontalBars.axis.height)
                .attr('transform', translate(labelWidth, height - C.horizontalBars.axis.height))
                .style('display', 'none')
                .style('pointer-events', 'none')
        }

        this.flexBrush.on('brush', (center) => {
            if (this.safeguardType === SGT.Value && this.variableType === VT.Value) {
                let constant = new PointValueConstant(this.xScale.invert(center));
                this.constant = constant;
                this.vis.constantSelected.emit(constant);
            }
            else if (this.safeguardType === SGT.Value && this.variableType === VT.Rank) {
                let index = Math.round((center - C.horizontalBars.axis.height - C.horizontalBars.label.height)
                    / C.horizontalBars.height)
                let constant = new PointRankConstant(index);
                this.constant = constant;
                this.vis.constantSelected.emit(constant);
            }
            else if (this.safeguardType === SGT.Range && this.variableType === VT.Value) {
                let sel = center as [number, number];
                let constant = new RangeValueConstant(this.xScale.invert(sel[0]), this.xScale.invert(sel[1]));
                this.constant = constant;
                this.vis.constantSelected.emit(constant);
            }
            else if (this.safeguardType === SGT.Range && this.variableType === VT.Rank) {
                let sel = center as [number, number];
                let index1 = Math.round((sel[0] - C.horizontalBars.axis.height) / C.horizontalBars.height)
                let index2 = Math.round((sel[1] - C.horizontalBars.axis.height) / C.horizontalBars.height)
                let constant = new RangeRankConstant(index1, index2);
                this.constant = constant;
                this.vis.constantSelected.emit(constant);
            }

            // ADD CODE FOR SGS
        })

        // update this.variableType = VT.Value or VT.Rank
        this.updateBrushWithVariableType();

        if (!this.constant) this.setDefaultConstantFromVariable();

        if ([SGT.Value, SGT.Range].includes(this.safeguardType) && this.constant)
            this.flexBrush.show();
        else
            this.flexBrush.hide();

        if (DistributiveSafeguardTypes.includes(this.safeguardType)) this.distributionLine.show();
        else this.distributionLine.hide();

        if (this.constant) {
            if (this.safeguardType === SGT.Value && this.variableType === VT.Value) {
                let center = xScale((this.constant as PointValueConstant).value);
                this.flexBrush.move(center);
            }
            else if (this.safeguardType === SGT.Value && this.variableType === VT.Rank) {
                let center = yScale((this.constant as PointRankConstant).rank.toString());
                this.flexBrush.move(center);
            }
            else if (this.safeguardType === SGT.Range && this.variableType === VT.Value) {
                let range = (this.constant as RangeValueConstant).range.map(this.xScale) as [number, number];
                this.flexBrush.move(range);
            }
            else if (this.safeguardType === SGT.Range && this.variableType === VT.Rank) {
                let range = (this.constant as RangeRankConstant).range.map(d => this.yScale(d.toString())) as [number, number];
                this.flexBrush.move(range);
            }
        }

        if (this.safeguardType === SGT.PowerLaw) {
            this.distributionLine.render(
                this.constant as DistributionTrait,
                data,
                (d: Datum, i: number) => { return [i + 1, 0]; },
                this.xScale, this.yScale
            )
        }
        else if(this.safeguardType === SGT.Normal) {
            this.distributionLine.render(
                this.constant as DistributionTrait,
                data,
                (d: Datum) => {
                    let range = d.keys.list[0].value();
                    if (range == null) return null;
                    return range as [number, number];
                },
                this.xScale, this.yScale
            )
        }

        // ADD CODE FOR SGS

        this.xScale = xScale;

        this.updateHighlight();
    }

    highlight(highlighted: number) {
        this.variableHighlight.style('display', 'none')
        this.variableHighlight2.style('display', 'none')
        this.constantHighlight1.style('display', 'none')
        this.constantHighlight2.style('display', 'none')

        if (highlighted == 1) {
            this.variableHighlight.style('display', 'inline')
        }
        else if (highlighted == 2) {

        }
        else if (highlighted == 3) {
            this.constantHighlight1.style('display', 'inline')
            this.constantHighlight2.style('display', 'inline')
        }
        else if (highlighted == 4) {
            this.variableHighlight2.style('display', 'inline')
        }
    }

    constant: ConstantTrait;

    safeguardType: SGT;
    setSafeguardType(st: SGT) {
        this.safeguardType = st;

        this.variable1 = null;
        this.variable2 = null;
        this.constant = null;
        this.updateHighlight();

        if (st == SGT.None) {
            this.labels.style('cursor', 'auto');
            this.flexBrush.hide();
        }
        else if (st == SGT.Value) {
            this.labels.style('cursor', 'pointer');
            this.flexBrush.setMode(FlexBrushMode.Point);
        }
        else if (st === SGT.Range) {
            this.labels.style('cursor', 'pointer');
            this.flexBrush.setMode(FlexBrushMode.SymmetricRange);
        }
        else if (st === SGT.Comparative) {
            this.labels.style('cursor', 'pointer');
        }
    }

    variableType: VT;
    setVariableType(vt: VT) {
        this.variableType = vt;
        this.constant = null;

        this.updateBrushWithVariableType();
    }

    updateBrushWithVariableType() {
        const labelWidth = this.labelWidth;
        const width = this.width, height = this.height;

        if (this.variableType == VT.Value || this.safeguardType == SGT.Range) {
            this.flexBrush.snap = null;

            this.flexBrush.setDirection(FlexBrushDirection.X);
            this.flexBrush.render([[labelWidth, C.horizontalBars.axis.height - C.padding],
            [width - C.padding, height - C.horizontalBars.axis.height + C.padding]]);
        }
        else {
            let start = C.horizontalBars.axis.height + C.horizontalBars.label.height;
            let step = C.horizontalBars.height;

            this.flexBrush.setDirection(FlexBrushDirection.Y);
            this.flexBrush.snap = d => {
                let index = Math.round((d - start) / step);
                return Math.max(1, index) * step + start;
            };

            this.flexBrush.render([[0, C.horizontalBars.axis.height],
            [width, height - C.horizontalBars.axis.height]]);
        }
    }

    updateHighlight() {
        this.eventBoxes
            .classed('highlighted', false)
            .filter((d) =>
                this.variable1 && this.variable1.fieldGroupedValue.hash === d.keys.list[0].hash ||
                this.variable2 && this.variable2.fieldGroupedValue.hash === d.keys.list[0].hash
            )
            .classed('highlighted', true)

        this.labels
            .classed('sg-highlighted', false)
            .filter((d) =>
                this.variable1 && this.variable1.fieldGroupedValue.hash === d.keys.list[0].hash ||
                this.variable2 && this.variable2.fieldGroupedValue.hash === d.keys.list[0].hash
            )
            .classed('sg-highlighted', true)

        this.eventBoxes
            .classed('variable2', false)
            .filter((d) => this.variable2 && this.variable2.fieldGroupedValue.hash === d.keys.list[0].hash)
            .classed('variable2', true)

        this.labels
            .classed('variable2', false)
            .filter((d) => this.variable2 && this.variable2.fieldGroupedValue.hash === d.keys.list[0].hash)
            .classed('variable2', true)
    }

    /* invoked when a constant is selected indirectly (by clicking on a category) */
    constantUserChanged(constant: ConstantTrait) {
        this.constant = constant;
        if (this.safeguardType === SGT.Value && this.variableType === VT.Value) {
            let center = this.xScale((constant as PointValueConstant).value);
            this.flexBrush.show();
            this.flexBrush.move(center);
        }
        else if (this.safeguardType === SGT.Value && this.variableType === VT.Rank) {
            let center = this.yScale((constant as PointRankConstant).rank.toString());
            this.flexBrush.show();
            this.flexBrush.move(center);
        }
        else if (this.safeguardType === SGT.Range && this.variableType === VT.Value) {
            let range = (constant as RangeValueConstant).range.map(this.xScale) as [number, number];
            this.flexBrush.setCenter((range[0] + range[1]) / 2);
            this.flexBrush.show();
            this.flexBrush.move(range);
        }
        else if (this.safeguardType === SGT.Range && this.variableType === VT.Rank) {
            let range = (constant as RangeRankConstant).range.map(d => this.yScale(d.toString())) as [number, number]
            this.flexBrush.show();
            this.flexBrush.move(range);
        }

        // ADD CODE FOR SGS
    }

    getDatum(variable: SingleVariable): Datum {
        return this.data.find(d => d.id === variable.fieldGroupedValue.hash);
    }

    getRank(variable: SingleVariable): number {
        for (let i = 0; i < this.data.length; i++) {
            if (this.data[i].id == variable.fieldGroupedValue.hash) return i + 1;
        }
        return 1;
    }

    datumSelected(d: Datum) {
        if (![SGT.Value, SGT.Range, SGT.Comparative].includes(this.safeguardType)) return;
        if (d.ci3 === EmptyConfidenceInterval) return;
        if (d.keys.hasNullValue()) return;

        let variable = new SingleVariable(d.keys.list[0]);
        if (this.variable2 && variable.fieldGroupedValue.hash === this.variable2.fieldGroupedValue.hash) return;

        this.variable1 = variable;

        if (this.safeguardType === SGT.Range) {
            this.flexBrush.setCenter(this.xScale(d.ci3.center));
        }
        this.updateHighlight();

        this.vis.variableSelected.emit({ variable: variable });
        this.setDefaultConstantFromVariable(true);
    }

    datumSelected2(d: Datum) {
        d3.event.preventDefault();
        if (this.safeguardType != SGT.Comparative) return;
        if (d.ci3 === EmptyConfidenceInterval) return;
        if (d.keys.hasNullValue()) return;

        let variable = new SingleVariable(d.keys.list[0]);

        if (this.variable1 && variable.fieldGroupedValue.hash === this.variable1.fieldGroupedValue.hash)
            return;
        this.variable2 = variable;
        this.updateHighlight();

        this.vis.variableSelected.emit({
            variable: variable,
            secondary: true
        });
    }

    setDefaultConstantFromVariable(removeCurrentConstant = false) {
        if (removeCurrentConstant) this.constant = null;
        if (this.constant) return;

        if (this.variable1) {
            if (this.safeguardType === SGT.Value && this.variableType === VT.Value) {
                let constant = new PointValueConstant(this.getDatum(this.variable1).ci3.center);
                this.vis.constantSelected.emit(constant);
                this.constantUserChanged(constant);
            }
            else if (this.safeguardType === SGT.Value && this.variableType === VT.Rank) {
                let constant = new PointRankConstant(this.getRank(this.variable1));

                this.vis.constantSelected.emit(constant);
                this.constantUserChanged(constant);
            }
            else if (this.safeguardType === SGT.Range && this.variableType === VT.Value) {
                let range = this.getDatum(this.variable1).ci3;
                let constant = new RangeValueConstant(range.low, range.high);

                this.vis.constantSelected.emit(constant);
                this.constantUserChanged(constant);
            }
            else if (this.safeguardType === SGT.Range && this.variableType === VT.Rank) {
                let rank = this.getRank(this.variable1);
                let constant = new RangeRankConstant(rank - 1, rank);

                this.vis.constantSelected.emit(constant);
                this.constantUserChanged(constant);
            }
        }
        else if (this.safeguardType === SGT.PowerLaw) {
            let constant = PowerLawConstant.FitFromVisData(this.query.getVisibleData());
            this.vis.constantSelected.emit(constant);
            this.constantUserChanged(constant);
        }
        else if (this.safeguardType === SGT.Normal) {
            let constant = NormalConstant.FitFromVisData(this.query.getVisibleData());
            this.vis.constantSelected.emit(constant);
            this.constantUserChanged(constant);
        }
    }

    /*
        constant selection:
            by selecting a category, no d3.event.sourceEvent
            by brushing, has d3.event.sourceEvent
            from outside (user input) = constantUserChanged, does not have d3.event.sourceEvent

        No vis.component handler propagates

    */


    showTooltip(d: Datum, i: number) {
        const clientRect = this.nativeSvg.getBoundingClientRect();
        const parentRect = this.nativeSvg.parentElement.getBoundingClientRect();

        let data = {
            query: this.query,
            datum: d
        };

        this.tooltip.show(
            clientRect.left - parentRect.left + this.xScale(d.ci3.center),
            clientRect.top - parentRect.top + this.yScale(i + ''),
            HorizontalBarsTooltipComponent,
            data
        );

        if ([SGT.Value, SGT.Range, SGT.Comparative].includes(this.safeguardType)) {
            let ele = d3.select(this.eventBoxes.nodes()[i]);
            ele.classed('highlighted', true)
        }
    }

    hideTooltip(d: Datum, i: number) {
        this.tooltip.hide();
        if ([SGT.Value, SGT.Range, SGT.Comparative].includes(this.safeguardType)) {
            if ((!this.variable1 || this.variable1.fieldGroupedValue.hash
                !== d.keys.list[0].hash) &&
                (!this.variable2 || this.variable2.fieldGroupedValue.hash
                    !== d.keys.list[0].hash)) {
                let ele = d3.select(this.eventBoxes.nodes()[i]);
                ele.classed('highlighted', false)
            }
        }
    }

    toggleDropdown(d: Datum, i: number) {
        d3.event.stopPropagation();

        if ([SGT.Value, SGT.Range, SGT.Comparative].includes(this.safeguardType)) return;
        if (this.vis.isDropdownVisible || this.vis.isQueryCreatorVisible) {
            this.closeDropdown();
            this.closeQueryCreator();
            return;
        }

        if (d == this.vis.selectedDatum) { // double click the same item
            this.closeDropdown();
        }
        else {
            this.openDropdown(d);
            return;
        }

        // always hide query creator
        this.vis.isQueryCreatorVisible = false;
    }

    openDropdown(d: Datum) {
        this.vis.selectedDatum = d;

        const clientRect = this.nativeSvg.getBoundingClientRect();
        const parentRect = this.nativeSvg.parentElement.getBoundingClientRect();

        let i = this.data.indexOf(d);
        let top = clientRect.top - parentRect.top + this.yScale(i + '')
            + C.horizontalBars.label.height + C.padding;

        this.vis.isDropdownVisible = true;
        this.vis.dropdownTop = top;
        this.vis.dropdownLeft = this.labelWidth;
    }

    closeDropdown() {
        this.vis.emptySelectedDatum();
        this.vis.isQueryCreatorVisible = false;
        this.vis.isDropdownVisible = false;
    }

    openQueryCreator(d: Datum) {
        if ([SGT.Value, SGT.Range, SGT.Comparative].includes(this.safeguardType)) return;

        const clientRect = this.nativeSvg.getBoundingClientRect();
        const parentRect = this.nativeSvg.parentElement.getBoundingClientRect();

        let i = this.data.indexOf(d);
        let top = clientRect.top - parentRect.top + this.yScale(i + '')
            + C.horizontalBars.label.height + C.padding;

        this.vis.isQueryCreatorVisible = true;
        this.vis.queryCreatorTop = top;
        this.vis.queryCreatorLeft = this.labelWidth;

        let where: AndPredicate = this.vis.query.where;
        // where + datum

        where = where.and(this.query.getPredicateFromDatum(d));
        this.vis.queryCreator.where = where;
    }

    closeQueryCreator() {
        this.vis.isQueryCreatorVisible = false;
    }

    emptySelectedDatum() {
        this.labels.classed('menu-open-highlighted', false);
    }
}
