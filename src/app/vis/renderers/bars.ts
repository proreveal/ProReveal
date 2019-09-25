import * as d3 from 'd3';
import { Constants as C, Constants } from '../../constants';
import * as util from '../../util';
import { measure } from '../../d3-utils/measure';
import { translate, selectOrAppend } from '../../d3-utils/d3-utils';
import { Gradient } from '../errorbars/gradient';
import { TooltipComponent } from '../../tooltip/tooltip.component';
import { BarsTooltipComponent } from './bars-tooltip.component';
import { SafeguardTypes as SGT, DistributiveSafeguardTypes } from '../../safeguard/safeguard';
import { SingleVariable } from '../../safeguard/variable';
import { VisComponent } from '../vis.component';
import { ScaleLinear } from 'd3';
import { ConstantTrait, RankConstant, ValueConstant, RangeConstant, PowerLawConstant, DistributionTrait, NormalConstant } from '../../safeguard/constant';
import { Brush, BrushDirection, BrushMode } from './brush';
import { DistributionLine } from './distribution-line';
import { AndPredicate, Predicate } from '../../data/predicate';
import { Datum } from '../../data/datum';
import { AggregateQuery } from '../../data/query';
import { LoggerService, LogType } from '../../services/logger.service';
import { EmptyConfidenceInterval, ConfidencePoint } from '../../data/confidence-interval';
import { VisGridSet } from '../vis-grid';

type Range = [number, number];

export class BarsRenderer {
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
    brush = new Brush<Datum>();
    distributionLine = new DistributionLine();

    labels: d3.Selection<d3.BaseType, Datum, d3.BaseType, {}>;
    ranks: d3.Selection<d3.BaseType, Datum, d3.BaseType, {}>;
    eventBoxes: d3.Selection<d3.BaseType, Datum, d3.BaseType, {}>;

    limitNumCategories = true;

    visG;
    interactionG;

    minimapBrush: d3.BrushBehavior<unknown>;

    constructor(public vis: VisComponent, public tooltip: TooltipComponent, public logger:LoggerService,
        public isMobile: boolean) {
    }

    setup(query: AggregateQuery, visGridSet: VisGridSet, floatingSvg: HTMLDivElement) {
        if (query.groupBy.fields.length > 1) {
            throw 'HorizontalBars can be used up to 1 groupBy';
        }

        let svg = visGridSet.d3Svg;

        this.gradient.setup(selectOrAppend(svg, 'defs'));
        this.visG = selectOrAppend(svg, 'g', 'vis');

        this.query = query;
        this.nativeSvg = visGridSet.svg;

        this.interactionG = selectOrAppend(svg, 'g', 'interaction');
        this.brush.setup(this.interactionG);
        this.distributionLine.setup(this.interactionG);
    }

    render(query: AggregateQuery, visGridSet: VisGridSet, floatingSvg: HTMLDivElement, minimap: HTMLDivElement) {
        let data = query.getVisibleData();

        this.data = data;

        if (this.limitNumCategories) {
            data = data.slice(0, C.bars.initiallyVisibleCategories);
        }

        let labelStrings = data.map(d => d.keys.list[0].valueString());
        if(this.isMobile) {
            labelStrings = labelStrings.map(s => {
                if(s.length > Constants.bars.maxLabelLength) {
                    return s.slice(0, Constants.bars.maxLabelLength) + Constants.bars.maxLabelEllipsis;
                }
                return s;
            });
        }

        let maxLabelWidth = labelStrings.length > 0 ? d3.max(labelStrings, l => measure(l, '.8rem').width) : 0;

        // 30 = rank + space
        // 10 = ~
        const labelWidth =
            Math.max(labelStrings.length > 0 ? (maxLabelWidth + (query.isRankAvailable ? 30 : 10)) : 0 + C.padding,
                measure(query.groupBy.fields[0].name, '.8rem').width + (query.isRankAvailable ? 30 : 10)
                + C.padding
            );

        this.labelWidth = labelWidth;

        const xMin = query.approximator.alwaysNonNegative ? 0 : d3.min(data, d => d.ci3.low);
        const xMax = d3.max(data, d => d.ci3.high);

        const niceTicks = d3.ticks(xMin, xMax, 10);
        const step = niceTicks[1] - niceTicks[0];
        const domainStart = query.approximator.alwaysNonNegative ? Math.max(0, niceTicks[0] - step) : (niceTicks[0] - step);
        const domainEnd = niceTicks[niceTicks.length - 1] + step;

        if (query.domainStart > domainStart) query.domainStart = domainStart;
        if (query.domainEnd < domainEnd) query.domainEnd = domainEnd;

        const xTitleHeight = C.bars.title.x.height;
        const xLabelHeight = C.bars.label.height;


        const barHeight = this.isMobile ? C.bars.mobile.height : C.bars.height;
        const barsFullHeight = barHeight * data.length;
        const height = this.isMobile ? (xTitleHeight +
            barsFullHeight + xLabelHeight) : (xTitleHeight * 2 +
            barsFullHeight + xLabelHeight * 2);

        let svg = d3.select(visGridSet.svg);
        let done = query.visibleProgress.done();
        let visG = svg.select('g.vis');

        visGridSet.d3Svg.on('contextmenu', () => d3.event.preventDefault());

        this.height = height;

        const availHeight = Math.min(window.screen.availHeight - 250, barsFullHeight + xTitleHeight);
        const barsAvailWidth = (this.isMobile ? window.screen.availWidth - 15 : Constants.bars.width) - labelWidth;
        const zoomXLevel = query.zoomXLevel;
        const barsFullWidth = (this.isMobile ? (window.screen.availWidth - 15) * zoomXLevel : Constants.bars.width) - labelWidth;
        const barsAvailHeight = availHeight - xTitleHeight - xLabelHeight;

        this.width = barsFullWidth;

        // Set dimensions (x: ->, y: ↓)
        visGridSet.setClass('bars');

        if(this.isMobile) {

            visGridSet.d3XTitle
                .attr('width', barsAvailWidth)
                .attr('height', xTitleHeight);

            visGridSet.d3XLabels
                .attr('width', barsFullWidth)
                .attr('height', xLabelHeight);

            visGridSet.d3XYTitle
                .attr('width', labelWidth)
                .attr('height', xLabelHeight);

            visGridSet.d3YLabels
                .attr('width', labelWidth)
                .attr('height', barsFullHeight);

            visGridSet.d3VisGrid
                .style('grid-template-columns', `0px ${labelWidth}px ${barsAvailWidth}px`)
                .style('grid-template-rows', `${xTitleHeight}px ${xLabelHeight}px ${barsAvailHeight}px`)

            visGridSet.d3Svg
                .attr('width', barsFullWidth)
                .attr('height', barsFullHeight);
        }
        else {
            d3.select(visGridSet.svg)
                .attr('width', barsFullWidth).attr('height', height)
        }

        const xScale = d3.scaleLinear()
            .domain([query.domainStart, query.domainEnd])
            .range([labelWidth, barsFullWidth - C.padding])
            .clamp(true)

        const yScale = d3.scaleBand().domain(util.srange(data.length))
            .range([xTitleHeight + xLabelHeight,
            height - xTitleHeight - xLabelHeight])
            .padding(0.1);

        if(this.isMobile) {
            xScale.range([C.padding, barsFullWidth - C.padding]);
            yScale.range([0, barsFullHeight]);
        }

        this.xScale = xScale;
        this.yScale = yScale;

        // render top and bottom x title
        {
            let target = this.isMobile ? visGridSet.d3XTitle : visG;
            let targetWidth = this.isMobile ? barsAvailWidth / 2 : (barsFullWidth + labelWidth) / 2;

            let xLabelTitle = Constants.locale.COUNT;
            if(query.target) xLabelTitle = Constants.locale.XLabelTitleFormatter(query);

            // x labels
            selectOrAppend(target, 'text', '.x.title.top')
                .text(xLabelTitle)
                .attr('transform', translate(targetWidth, 0))
                .style('text-anchor', 'middle')
                .attr('dy', C.bars.title.x.dy)
                .style('font-size', C.bars.title.x.fontSize)
                .style('font-style', 'italic')

            if(!this.isMobile)
                selectOrAppend(visG, 'text', '.x.title.bottom')
                    .text(xLabelTitle)
                    .attr('transform', translate(targetWidth, height - xTitleHeight))
                    .style('text-anchor', 'middle')
                    .attr('dy', C.bars.title.x.dy)
                    .style('font-size', C.bars.title.x.fontSize)
                    .style('font-style', 'italic')
        }

        // render y title
        {
            let target = this.isMobile ? visGridSet.d3XYTitle : visG;
            let targetX = this.isMobile ? labelWidth - 1.5 * C.padding : (labelWidth - 1.5 * C.padding);
            let targetY = this.isMobile ? 0 : xLabelHeight;

            selectOrAppend(target, 'text', '.y.title')
                .text(query.groupBy.fields[0].name)
                .attr('transform', translate(targetX, targetY))
                .style('text-anchor', 'end')
                .attr('dy', this.isMobile ? '1.3rem' : '1.1rem')
                .style('font-size', '.8rem')
                .style('font-style', 'italic')
        }

        const majorTickLines = d3.axisTop(xScale).tickSize(-(height - (this.isMobile ? 1 : 2) * (xTitleHeight + xLabelHeight)));

        // render major ticks
        {
            let targetY = this.isMobile ? 0 : (xTitleHeight + xLabelHeight);

            selectOrAppend(visG, 'g', '.sub.axis')
                .style('opacity', .2)
                .attr('transform', translate(0, targetY))
                .transition()
                .call(majorTickLines as any)
                .selectAll('text')
                .style('display', 'none')
        }

        // render the top axis
        {
            const topAxis = d3.axisTop(xScale).tickFormat(d3.format('~s'));
            let target = this.isMobile ? visGridSet.d3XLabels : visG;
            let targetY = this.isMobile ? xLabelHeight - C.padding : (xTitleHeight + xLabelHeight);

            selectOrAppend(target, 'g', '.x.labels.top')
                .attr('transform', translate(0, targetY))
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
                .attr('width', barsFullWidth)
                .attr('class', 'event-box variable1')
                .attr('transform', (d, i) => translate(0, yScale(i + '')))
                .style('pointer-events', 'none')

            eventBoxes.exit().remove();
        }

        // render ranks
        if (query.isRankAvailable) {
            let target = this.isMobile ? visGridSet.d3YLabels : visG;

            let background = target.selectAll('rect.alternate')
                .data(data, (d: any) => d.id);

            enter = background.enter().append('rect').attr('class', 'alternate')

            background.merge(enter)
                .attr('height', yScale.bandwidth() * (1 + yScale.padding() / 2))
                .attr('width', labelWidth)
                .attr('transform', (d, i) => translate(0, yScale(i + '')))
                .attr('fill', 'black')
                .style('opacity', (d, i) => !d.keys.hasNullValue() && i % 2 ? 0.08 : 0);

            background.exit().remove();

            let ranks = target
                .selectAll('text.rank')
                .data(data, (d: any) => d.id);

            enter = ranks.enter().append('text').attr('class', 'rank variable1')
                .attr('font-size', '.8rem')
                .attr('dy', '.3rem')
                .style('user-select', 'none')

            this.ranks = ranks.merge(enter)
                .attr('transform', (d, i) => translate(0, yScale(i + '') + yScale.bandwidth() / 2))
                .text((d, i) => `${i + 1}`)
                .style('opacity', d => {
                    if (d.keys.hasNullValue()) return 0;
                    return 0.5;
                })

            ranks.exit().remove();
        }

        // render labels
        {
            let target = this.isMobile ? visGridSet.d3YLabels : visG;

            let labels = target
                .selectAll('text.y.data.label')
                .data(data, (d: any) => d.id);

            enter = labels.enter().append('text').attr('class', 'label y data variable1')
                .style('text-anchor', 'end')
                .attr('font-size', '.8rem')
                .attr('dy', '.3rem')
                .style('user-select', 'none')

            this.labels = labels.merge(enter)
                .attr('transform', (d, i) => translate(labelWidth - C.padding, yScale(i + '') + yScale.bandwidth() / 2))
                .text((d) => {
                    let s = d.keys.list[0].valueString();
                    if(this.isMobile && s.length > Constants.bars.maxLabelLength) {
                        return s.slice(0, Constants.bars.maxLabelLength) + Constants.bars.maxLabelEllipsis;
                    }
                    return s;
                })
                .style('opacity', d => {
                    if (d.keys.hasNullValue()) return 0.6;
                    return 1;
                })
                .style('cursor', 'pointer')
                .on('mouseenter', (d, i, ele) => {
                    this.showTooltip(d, i);
                    d3.select(ele[i]).classed('hover', true);
                })
                .on('mouseleave', (d, i, ele) => {
                    this.hideTooltip();
                    d3.select(ele[i]).classed('hover', false);
                })
                .on('click', (d, i, ele) => {
                    if(this.safeguardType == SGT.Comparative) {
                        this.datumSelected2(d);
                        return;
                    }
                    this.datumSelected(d);
                    this.toggleDropdown(d, i);

                    let d3ele = d3.select(ele[i]);
                    d3ele.classed('menu-highlighted', this.vis.selectedDatum === d);
                })

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
                .attr('width', d => done ? 0 : Math.max(xScale(d.ci3.center) - xScale(d.ci3.low), Constants.bars.minimumGradientWidth))
                .attr('transform', (d, i) => {
                    if(xScale(d.ci3.center) - xScale(d.ci3.low) < Constants.bars.minimumGradientWidth)
                        return translate(xScale(d.ci3.center) - Constants.bars.minimumGradientWidth, yScale(i + ''))
                    return translate(xScale(d.ci3.low), yScale(i + ''));
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
                .attr('width', d => done ? 0 : Math.max(xScale(d.ci3.high) - xScale(d.ci3.center), Constants.bars.minimumGradientWidth))
                .attr('transform', (d, i) => {
                    if(xScale(d.ci3.high) - xScale(d.ci3.center) < Constants.bars.minimumGradientWidth)
                        return translate(xScale(d.ci3.center), yScale(i + ''))
                    return translate(xScale(d.ci3.center), yScale(i + ''));
                })
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
                .style('stroke-dasharray', (d) => d.ci3 instanceof ConfidencePoint ? 2 : 0)

            centerLines.exit().remove();
        }

        // render circles when done
        if (done) {
            const circles = visG.selectAll('circle')
                .data(data, (d: any) => d.id);

            enter = circles.enter().append('circle')
                .attr('r', C.bars.circleRadius)
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
                .style('cursor', 'pointer')
                .attr('height', yScale.bandwidth())
                .attr('width', d => Math.max(Constants.bars.minimumGradientWidth * 2, xScale(d.ci3.high) - xScale(d.ci3.low)))
                .attr('transform', (d, i) => {
                    if(Constants.bars.minimumGradientWidth * 2 > xScale(d.ci3.high) - xScale(d.ci3.low))
                        return translate(xScale(d.ci3.center) - Constants.bars.minimumGradientWidth, yScale(i + ''))
                    return translate(xScale(d.ci3.low), yScale(i + ''))
                })
                .style('fill', 'transparent')
                .on('mouseenter', (d, i) => {
                    this.showTooltip(d, i);
                    this.labels.filter(datum => datum == d).classed('hover', true);
                })
                .on('mouseleave', (d, i) => {
                    this.hideTooltip();
                    this.labels.filter(datum => datum == d).classed('hover', false);
                })
                .on('click', (d, i) => {
                    if(d.ci3 == EmptyConfidenceInterval) return;
                    if(this.safeguardType == SGT.Comparative) {
                        this.datumSelected2(d);
                        return;
                    }

                    this.datumSelected(d);
                    this.toggleDropdown(d, i);

                    this.labels.filter(datum => datum == d).classed('menu-highlighted', this.vis.selectedDatum === d);
                })

            barEventBoxes.exit().remove();
        }

        // render the bottom axis
        if(!this.isMobile) {
            const bottomAxis = d3.axisBottom(xScale).tickFormat(d3.format('~s'));

            selectOrAppend(visG, 'g', '.x.axis.bottom')
                .attr('transform', translate(0, height - xTitleHeight - xLabelHeight))
                .transition()
                .call(bottomAxis as any)
        }

        // minimap

        let d3minimap = d3.select(minimap);
        let d3minisvg = d3minimap.select('svg');

        let miniBarHeight = Math.min(Math.floor(C.heatmap.minimap.maxHeight / data.length), 3);

        if(this.isMobile) {
            d3minisvg
                .attr('width', C.bars.minimap.width)
                .attr('height', miniBarHeight * data.length)

            let g = selectOrAppend(d3minisvg, 'g', '.mini-bars');

            const rects =
                g.selectAll('rect.bar')
                .data(data, (d: any) => d.id);

            enter = rects
                .enter().append('rect').attr('class', 'bar')

            const miniXScale = d3.scaleLinear().domain([query.domainStart, query.domainEnd])
                .range([0, C.bars.minimap.width])
                .clamp(true)

            const miniYScale = d3.scaleBand().domain(util.srange(data.length))
                .range([0, miniBarHeight * data.length])
                .padding(0);

            rects.merge(enter)
                .attr('width', d => done ? 2 : Math.max(miniXScale(d.ci3.high) - miniXScale(d.ci3.low), Constants.bars.minimumGradientWidth))
                .attr('transform', (d, i) => {
                    if(miniXScale(d.ci3.high) - miniXScale(d.ci3.low) < Constants.bars.minimumGradientWidth)
                        return translate(miniXScale(d.ci3.center) - Constants.bars.minimumGradientWidth / 2, miniYScale(i + ''))
                    return translate(miniXScale(d.ci3.low), miniYScale(i + ''));
                })
                .attr('height', miniYScale.bandwidth())
                .attr('fill', d => d.ci3 === EmptyConfidenceInterval ?
                    'transparent' : 'steelblue'
                );

            rects.exit().remove();

            let brush = d3.brush().handleSize(0);
            this.minimapBrush = brush;

            let left = visGridSet.svg.parentElement.scrollLeft,
                top = visGridSet.svg.parentElement.scrollTop;

            let wrapper = selectOrAppend(d3minisvg, 'g', '.brush-wrapper')
                .call(brush)
                .call(brush.move, [[left / barsFullWidth * C.bars.minimap.width,
                    top / barHeight * miniBarHeight],
                [(left + barsAvailWidth) / barsFullWidth * C.bars.minimap.width,
                    (top + barsAvailHeight) / barHeight * miniBarHeight]])

            wrapper.select('.selection').style('stroke', 'none');

            wrapper
                .selectAll('.overlay').remove();
        }

        // sync scroll (mobile)
        if(this.isMobile) {
            let wrapper = visGridSet.svg.parentElement;
            let xFromLabel = false, xFromSvg = false, yFromLabel = false, yFromSvg = false;
            let xyFromBrush = false, xyFromSvg = false;

            d3.select(wrapper)
                .on('scroll', null)
                .on('scroll', () => {
                    this.hideTooltip();
                    let left = wrapper.scrollLeft,
                        top = wrapper.scrollTop;

                    if(yFromLabel) yFromLabel = false;
                    else {
                        visGridSet.yLabels.parentElement.scrollTop = top;
                        yFromSvg = true;
                    }

                    if(xFromLabel) xFromLabel = false;
                    else {
                        visGridSet.xLabels.parentElement.scrollLeft = left;
                        xFromSvg = true;
                    }

                    if(xyFromBrush) {
                        visGridSet.yLabels.parentElement.scrollTop = top;
                        visGridSet.xLabels.parentElement.scrollLeft = left;
                        yFromSvg = true;
                        xFromSvg = true;
                        xyFromBrush = false;
                    }
                    else {
                        selectOrAppend(d3minisvg, 'g', '.brush-wrapper')
                            .call(this.minimapBrush.move, [
                                [left / barsFullWidth * C.bars.minimap.width,
                                    top / barHeight * miniBarHeight],
                                [(left + barsAvailWidth) / barsFullWidth * C.bars.minimap.width,
                                    (top + barsAvailHeight) / barHeight * miniBarHeight]
                            ])

                        xyFromSvg = true;
                    }
                })

            d3.select(visGridSet.xLabels.parentElement)
                .on('scroll', null)
                .on('scroll', () => {
                    if(xFromSvg) { xFromSvg = false; return; }
                    let left = visGridSet.xLabels.parentElement.scrollLeft;
                    visGridSet.svg.parentElement.scrollLeft = left;
                    xFromLabel = true;
                })

            d3.select(visGridSet.yLabels.parentElement)
                .on('scroll', null)
                .on('scroll', () => {
                    if(yFromSvg) { yFromSvg = false; return;}
                    let top = visGridSet.yLabels.parentElement.scrollTop
                    visGridSet.svg.parentElement.scrollTop = top;
                    yFromLabel = true;
                })

            this.minimapBrush.on('start brush', () => {
                let [[x0, y0], [x1, y1]] = d3.event.selection;

                if(xyFromSvg) {xyFromSvg = false; return;}

                visGridSet.svg.parentElement.scrollLeft = x0 / C.bars.minimap.width * barsFullWidth,
                visGridSet.svg.parentElement.scrollTop = y0 / miniBarHeight * barHeight;

                xyFromSvg = true;
            })
        }

        d3.select(floatingSvg).style('display', 'none');

        this.brush.on('brush', (centerOrRange) => {
            if (this.safeguardType === SGT.Value) {
                let constant = new ValueConstant(this.xScale.invert(centerOrRange));
                this.constant = constant;
                this.vis.constantSelected.emit(constant);
            }
            else if (this.safeguardType === SGT.Rank) {
                let index = Math.round((centerOrRange - xTitleHeight - xLabelHeight)
                    / barHeight)
                if(index <= 0) index = 1;
                let constant = new RankConstant(index);
                this.constant = constant;
                this.vis.constantSelected.emit(constant);
            }
            else if (this.safeguardType === SGT.Range) {
                let [center, from, to] = centerOrRange as [number, number, number];
                let constant = new RangeConstant(
                    this.xScale.invert(center),
                    this.xScale.invert(from),
                    this.xScale.invert(to));
                this.constant = constant;
                this.vis.constantSelected.emit(constant);
            }
        })

        if (this.safeguardType == SGT.Value || this.safeguardType == SGT.Range) {
            this.brush.snap = null;

            this.brush.setDirection(BrushDirection.X);
            this.brush.render([[xScale.range()[0], yScale.range()[0]],
            [xScale.range()[1], yScale.range()[1]]]);
        }
        else if(this.safeguardType === SGT.Rank) {
            let start = yScale.range()[0];
            let step = barHeight;

            this.brush.setDirection(BrushDirection.Y);
            this.brush.hideReferenceLine();
            this.brush.snap = d => {
                let index = Math.round((d - start) / step);
                return Math.max(1, index) * step + start;
            };

            this.brush.render([[0, yScale.range()[0]],
            [barsFullWidth, yScale.range()[1]]]);
        }

        if (!this.constant) this.setDefaultConstantFromVariable();

        if ([SGT.Value, SGT.Rank, SGT.Range].includes(this.safeguardType) && this.constant)
            this.brush.show();
        else
            this.brush.hide();

        if (DistributiveSafeguardTypes.includes(this.safeguardType)) this.distributionLine.show();
        else this.distributionLine.hide();

        if(this.variable1 && this.safeguardType === SGT.Value) {
            let d = this.getDatum(this.variable1);
            this.brush.setReferenceValue(this.xScale(d.ci3.center));
            console.log(d.ci3.center, this.xScale(d.ci3.center))

            if(this.constant) {
                let center = xScale((this.constant as ValueConstant).value);
                this.brush.move(center);
            }
        }
        else if (this.variable1 && this.safeguardType === SGT.Rank) {
            if(this.constant) {
                let center = yScale((this.constant as RankConstant).rank.toString());
                this.brush.move(center);
            }
        }
        else if(this.variable1 && this.safeguardType === SGT.Range) {
            let d = this.getDatum(this.variable1);
            this.brush.setReferenceValue(this.xScale(d.ci3.center));
            this.brush.setCenter(this.xScale(d.ci3.center));

            if(this.constant) {
                let oldRange = (this.constant as RangeConstant).range;
                let half = (oldRange[1] - oldRange[0]) / 2;
                let newCenter = this.getDatum(this.variable1).ci3.center;
                let xDomain = xScale.domain();

                if(xDomain[0] > newCenter - half) { half = newCenter - xDomain[0]; }
                if(xDomain[1] < newCenter + half) { half = Math.min(half, xDomain[1] - newCenter); }

                let range = [newCenter - half, newCenter + half] as Range;

                let constant = new RangeConstant(newCenter, range[0], range[1]);

                this.vis.constantSelected.emit(constant);
                this.constantUserChanged(constant);
            }
        }
        else if (this.safeguardType === SGT.PowerLaw) {
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

        this.updateHighlight();
    }

    constant: ConstantTrait;

    safeguardType: SGT = SGT.None;
    setSafeguardType(st: SGT) {
        this.safeguardType = st;

        this.variable1 = null;
        this.variable2 = null;
        this.constant = null;
        this.updateHighlight();

        if (st == SGT.None) {
            this.labels.style('cursor', 'auto');
            this.brush.hide();
        }
        else if (st == SGT.Value || st === SGT.Rank) {
            this.labels.style('cursor', 'pointer');
            this.brush.setMode(BrushMode.Point);
        }
        else if (st === SGT.Range) {
            this.labels.style('cursor', 'pointer');
            this.brush.setMode(BrushMode.SymmetricRange);
        }
        else if (st === SGT.Comparative) {
            this.labels.style('cursor', 'pointer');
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
            .classed('highlighted', false)
            .filter((d) => this.variable1 && this.variable1.fieldGroupedValue.hash === d.keys.list[0].hash ||
                this.variable2 && this.variable2.fieldGroupedValue.hash === d.keys.list[0].hash
            )
            .classed('highlighted', true)

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
        if (this.safeguardType === SGT.Value) {
            let center = this.xScale((constant as ValueConstant).value);
            this.brush.show();
            this.brush.move(center);
        }
        else if (this.safeguardType === SGT.Rank) {
            let center = this.yScale((constant as RankConstant).rank.toString());
            this.brush.show();
            this.brush.move(center, false, true);
        }
        else if (this.safeguardType === SGT.Range) {
            let range = (constant as RangeConstant).range.map(this.xScale) as Range;
            this.brush.setCenter(this.xScale((constant as RangeConstant).center));
            this.brush.show();
            this.brush.move(range);
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
        if (![SGT.Value, SGT.Rank, SGT.Range, SGT.Comparative].includes(this.safeguardType)) return;
        if (d.ci3 === EmptyConfidenceInterval) return;
        if (d.keys.hasNullValue()) return;

        this.logger.log(LogType.DatumSelected, {
            datum: d.toLog(),
            data: this.data.map(d => d.toLog())
        });

        let variable = new SingleVariable(d.keys.list[0]);
        if (this.variable2 && variable.fieldGroupedValue.hash === this.variable2.fieldGroupedValue.hash) return;

        this.variable1 = variable;

        if(this.safeguardType === SGT.Value) {
            this.brush.setReferenceValue(this.xScale(d.ci3.center));
        }
        if (this.safeguardType === SGT.Range) {
            this.brush.setReferenceValue(this.xScale(d.ci3.center));
            this.brush.setCenter(this.xScale(d.ci3.center));
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

        this.logger.log(LogType.DatumSelected, {
            datum: d.toLog(),
            data: this.data.map(d => d.toLog())
        });

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
            if (this.safeguardType === SGT.Value) {
                let constant = new ValueConstant(this.getDatum(this.variable1).ci3.center);
                this.vis.constantSelected.emit(constant);
                this.constantUserChanged(constant);
            }
            else if (this.safeguardType === SGT.Rank) {
                let constant = new RankConstant(this.getRank(this.variable1));

                this.vis.constantSelected.emit(constant);
                this.constantUserChanged(constant);
            }
            else if (this.safeguardType === SGT.Range) {
                let range = this.getDatum(this.variable1).ci3;
                let low = range.low;
                let center = range.center;
                let high = range.high;

                if(range instanceof ConfidencePoint) {
                    let width = this.xScale.invert(300) - this.xScale.invert(290);
                    low = center - width;
                    high = center + width;
                }

                let domain = this.xScale.domain();

                if(low < domain[0]) { high -= (domain[0] - low); low = domain[0]; }
                if(high > domain[1]) { low -= (high - domain[1]); high = domain[1]; }

                let constant: RangeConstant;

                constant = new RangeConstant(center, low, high);

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

    showTooltip(d: Datum, i: number) {
        const clientRect = this.nativeSvg.getBoundingClientRect();
        const parentRect = this.nativeSvg.parentElement.parentElement.parentElement.getBoundingClientRect();

        let data = {
            query: this.query,
            datum: d
        };

        this.tooltip.show(
            clientRect.left - parentRect.left + this.xScale(d.ci3.center),
            clientRect.top - parentRect.top + this.yScale(i + ''),
            BarsTooltipComponent,
            data
        );

        if ([SGT.Value, SGT.Rank, SGT.Range, SGT.Comparative].includes(this.safeguardType)) {
            let ele = d3.select(this.eventBoxes.nodes()[i]);
            ele.classed('highlighted', true)
        }
    }

    hideTooltip(/*d: Datum, i: number*/) {
        this.tooltip.hide();

        // if ([SGT.Value, SGT.Rank, SGT.Range, SGT.Comparative].includes(this.safeguardType)) {
        //     if ((!this.variable1 || this.variable1.fieldGroupedValue.hash
        //         !== d.keys.list[0].hash) &&
        //         (!this.variable2 || this.variable2.fieldGroupedValue.hash
        //             !== d.keys.list[0].hash)) {
        //         let ele = d3.select(this.eventBoxes.nodes()[i]);
        //         ele.classed('highlighted', false)
        //     }
        // }
    }

    toggleDropdown(d: Datum, i: number) {
        d3.event.stopPropagation();

        if ([SGT.Value, SGT.Rank, SGT.Range, SGT.Comparative].includes(this.safeguardType)) return;
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
        const parentRect = this.nativeSvg.parentElement.parentElement.parentElement.getBoundingClientRect();

        let i = this.data.indexOf(d);
        let top = clientRect.top - parentRect.top + this.yScale(i + '')
            + C.bars.label.height + C.padding;

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
        if (this.safeguardType != SGT.None) return;

        const clientRect = this.nativeSvg.getBoundingClientRect();
        const parentRect = this.nativeSvg.parentElement.parentElement.parentElement.getBoundingClientRect();

        let i = this.data.findIndex(datum => datum.id === d.id);

        let top = clientRect.top - parentRect.top + this.yScale(i + '')
            + this.yScale.bandwidth() / 2 + C.padding;

        this.vis.isQueryCreatorVisible = true;

        if(!this.isMobile) {
            this.vis.queryCreatorTop = top;
            this.vis.queryCreatorLeft = this.labelWidth;
        }

        let where: Predicate = this.vis.query.where;
        // where + datum

        this.vis.queryCreator.where = where ? where.and(this.query.getPredicateFromDatum(d))
         : new AndPredicate([this.query.getPredicateFromDatum(d)]);
    }

    closeQueryCreator() {
        this.vis.isQueryCreatorVisible = false;
    }

    removeMenuHighlighted() {
        this.labels.classed('menu-highlighted', false);
    }
}
