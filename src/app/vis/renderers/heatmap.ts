import * as d3 from 'd3';
import { Constants as C } from '../../constants';
import { AggregateQuery, Histogram2DQuery } from '../../data/query';
import { measure } from '../../d3-utils/measure';
import { translate, selectOrAppend } from '../../d3-utils/d3-utils';
import { QuantitativeField } from '../../data/field';
import { TooltipComponent } from '../../tooltip/tooltip.component';
import * as vsup from 'vsup';
import { VisComponent } from '../vis.component';
import { ConstantTrait, ValueConstant, RangeConstant, LinearConstant } from '../../safeguard/constant';
import { SafeguardTypes as SGT } from '../../safeguard/safeguard';
import { CombinedVariable, SingleVariable } from '../../safeguard/variable';
import { HeatmapTooltipComponent } from './heatmap-tooltip.component';
import { Gradient } from '../errorbars/gradient';
import { NullGroupId } from '../../data/grouper';
import { Datum } from '../../data/datum';
import { AngularBrush, AngularBrushMode } from './angular-brush';
import { Predicate, AndPredicate } from '../../data/predicate';
import { LinearLine } from './linear-line';
import { LoggerService, LogType } from '../../services/logger.service';
import { FieldGroupedValue } from '../../data/field-grouped-value';
import { EmptyConfidenceInterval } from '../../data/confidence-interval';
import { VisGridSet } from '../vis-grid';
import { heatmapLegend } from '../vsup/legend';
import { Brush, BrushMode } from './brush';

type Range = [number, number];

export class HeatmapRenderer {
    gradient = new Gradient();
    data: Datum[];
    xScale: d3.ScaleBand<string>;
    yScale: d3.ScaleBand<string>;
    matrixWidth: number;
    header: number;

    variable1: CombinedVariable;
    variable2: CombinedVariable;
    query: AggregateQuery;
    nativeSvg: SVGSVGElement;
    legendXScale: d3.ScaleLinear<number, number>; // value -> pixel
    brush = new Brush<Datum>();
    linearLine = new LinearLine();

    eventBoxes: d3.Selection<d3.BaseType, Datum, d3.BaseType, {}>;
    visG;
    interactionG;
    xValuesCount: number;
    yValuesCount: number;

    xTopLabels: d3.Selection<d3.BaseType, FieldGroupedValue, d3.BaseType, {}>;
    xBottomLabels: d3.Selection<d3.BaseType, FieldGroupedValue, d3.BaseType, {}>;
    yLabels: d3.Selection<d3.BaseType, FieldGroupedValue, d3.BaseType, {}>;
    expectedWidth: number;

    limitNumCategories = true;

    minimapBrush: d3.BrushBehavior<unknown>;

    constructor(public vis: VisComponent, public tooltip: TooltipComponent, public logger: LoggerService,
        public isMobile: boolean) {
    }

    setup(query: AggregateQuery, nativeSvg: SVGSVGElement, floatingSvg: HTMLDivElement, minimap: HTMLDivElement) {
        if (query.groupBy.fields.length !== 2) {
            throw 'Heatmaps can be used for 2 categories!';
        }

        let svg = d3.select(nativeSvg);

        this.gradient.setup(selectOrAppend(svg, 'defs'));
        this.visG = selectOrAppend(svg, 'g', 'vis');

        this.query = query;
        this.nativeSvg = nativeSvg;

        this.interactionG = selectOrAppend(svg, 'g', 'interaction').classed('heatmap', true);

        let fsvgw = d3.select(floatingSvg);
        let fbrush = fsvgw.select('.brush');
        this.brush.setup(fbrush);
        this.linearLine.setup(this.interactionG);
    }

    render(query: AggregateQuery, visGridSet: VisGridSet, floatingSvg: HTMLDivElement, minimap: HTMLDivElement) {
        // Data Processing (view independent)

        let data = query.getVisibleData();
        this.data = data;

        let xKeys = {}, yKeys = {};

        data.forEach(row => {
            xKeys[row.keys.list[0].hash] = row.keys.list[0];
            yKeys[row.keys.list[1].hash] = row.keys.list[1];
        });

        let xValues: FieldGroupedValue[] = d3.values(xKeys);
        let yValues: FieldGroupedValue[] = d3.values(yKeys);

        this.xValuesCount = xValues.length;
        this.yValuesCount = yValues.length;

        if (this.query instanceof Histogram2DQuery) {
            let sortFunc = (a: FieldGroupedValue, b: FieldGroupedValue) => {
                let av = a.value(), bv = b.value();

                if (a.groupId === NullGroupId) return 1;
                if (b.groupId === NullGroupId) return -1;

                let ap = av ? av[0] as number : (a.field as QuantitativeField).max;
                let bp = bv ? bv[0] as number : (b.field as QuantitativeField).max;

                return ap - bp;
            }
            xValues.sort(sortFunc)
            yValues.sort(sortFunc);

            //yValues = yValues.reverse();
        }
        else {
            let weight = {}, count = {};
            data.forEach(row => {
                function accumulate(dict, key, value) {
                    if (!dict[key]) dict[key] = 0;
                    dict[key] += value;
                }

                accumulate(weight, row.keys.list[0].hash, row.ci3.center);
                accumulate(weight, row.keys.list[1].hash, row.ci3.center);
                accumulate(count, row.keys.list[0].hash, 1);
                accumulate(count, row.keys.list[1].hash, 1);
            })

            for (let key in weight) { weight[key] /= count[key]; }

            let sortFunc = (a: FieldGroupedValue, b: FieldGroupedValue) => {
                if (a.groupId === NullGroupId) return 1;
                if (b.groupId === NullGroupId) return -1;
                return weight[b.hash] - weight[a.hash];
            }

            xValues.sort(sortFunc);
            yValues.sort(sortFunc);
        }

        if (this.limitNumCategories) {
            xValues = xValues.slice(0, C.heatmap.initiallyVisibleCategories);
            yValues = yValues.slice(0, C.heatmap.initiallyVisibleCategories);

            let xKeys = {}, yKeys = {};
            xValues.forEach(v => xKeys[v.hash] = true);
            yValues.forEach(v => yKeys[v.hash] = true);

            data = data.filter(d => xKeys[d.keys.list[0].hash] && yKeys[d.keys.list[1].hash]);
        }

        const yLabelWidth = d3.max(yValues, v => measure('~' + v.valueString()).width) || 0;
        const xLabelWidth = d3.max(xValues, v => measure('~' + v.valueString()).width) || 0;

        const xTitleHeight = C.heatmap.title.x.height;
        const yTitleWidth = C.heatmap.title.y.width;

        const zoomXLevel = query.zoomXLevel;
        const zoomYLevel = query.zoomYLevel;

        const columnWidth = C.heatmap.columnWidth * zoomXLevel;
        const rowHeight = C.heatmap.rowHeight * zoomYLevel;

        let heatmapFullWidth = columnWidth * xValues.length;
        let heatmapFullHeight = rowHeight * yValues.length;
        let heatmapXLabelHeight = 1.414 / 2 * xLabelWidth;
        const headerHeight = heatmapXLabelHeight + xTitleHeight

        const height = rowHeight * yValues.length + headerHeight * 2;

        const legendSpec = this.isMobile ? C.heatmap.mobile.legend : C.heatmap.legend;

        const matrixWidth = xValues.length > 0 ?
            (yTitleWidth + yLabelWidth + columnWidth * xValues.length) : 0;
        const width = matrixWidth + legendSpec.width * 1.2;

        this.matrixWidth = matrixWidth;

        let availWidth = Math.min(window.screen.availWidth - 10, heatmapFullWidth + yTitleWidth + yLabelWidth);
        let heatmapAvailHeight: number;
        let screenAvailHeight = window.screen.availHeight - 290;

        if(screenAvailHeight < heatmapFullHeight + headerHeight) {
            heatmapAvailHeight = screenAvailHeight - headerHeight;
        }
        else {
            heatmapAvailHeight = heatmapFullHeight;
        }

        let heatmapAvailWidth = availWidth - C.heatmap.title.y.width - yLabelWidth;

        // Set dimensions (x: ->, y: ↓)
        visGridSet.setClass('heatmap');

        if(this.isMobile) {
            visGridSet.d3XTitle
                .attr('width', heatmapAvailWidth)
                .attr('height', C.heatmap.title.x.height);

            visGridSet.d3XLabels
                .attr('width', heatmapFullWidth)
                .attr('height', heatmapXLabelHeight);

            visGridSet.d3YTitle.attr('width', C.heatmap.title.y.width)
                .attr('height', heatmapAvailHeight);

            visGridSet.d3YLabels
                .attr('width', yLabelWidth)
                .attr('height', heatmapFullHeight);

            visGridSet.d3VisGrid
                .style('grid-template-columns', `${C.heatmap.title.y.width}px ${yLabelWidth}px ${heatmapAvailWidth}px`)
                .style('grid-template-rows', `${C.heatmap.title.x.height}px ${heatmapXLabelHeight}px ${heatmapAvailHeight}px`)

            visGridSet.d3Svg.attr('width', heatmapFullWidth)
                .attr('height', heatmapFullHeight);
        }
        else {
            d3.select(visGridSet.svg).attr('width', width)
                .attr('height', Math.max(height, legendSpec.height + legendSpec.paddingTop + legendSpec.paddingBottom));
        }

        const xScale = d3.scaleBand().domain(xValues.map(d => d.hash))
            .range([yTitleWidth + yLabelWidth, matrixWidth - headerHeight]);

        const yScale = d3.scaleBand().domain(yValues.map(d => d.hash))
            .range([headerHeight, height - headerHeight]);

        if(this.isMobile) {
            xScale.range([0, heatmapFullWidth]);
            yScale.range([0, heatmapFullHeight]);
        }

        this.header = headerHeight;
        this.xScale = xScale;
        this.yScale = yScale;

        let visG = d3.select(visGridSet.svg).select('g.vis');

        // render top and bottom x title
        {
            let target = this.isMobile ? visGridSet.d3XTitle : visG;
            let targetWidth = this.isMobile ? heatmapAvailWidth / 2 : matrixWidth / 2;

            selectOrAppend(target, 'text', '.x.title.top')
                .text(query.groupBy.fields[0].name)
                .attr('transform', translate(targetWidth, 0))
                .style('text-anchor', 'middle')
                .attr('dy', C.heatmap.title.x.dy)
                .style('font-size', C.heatmap.title.x.fontSize)
                .style('font-style', 'italic')

            if(!this.isMobile)
                selectOrAppend(target, 'text', '.x.title.bottom')
                    .text(query.groupBy.fields[0].name)
                    .attr('transform', translate(matrixWidth / 2, height - C.heatmap.title.x.height))
                    .style('text-anchor', 'middle')
                    .attr('dy', C.heatmap.title.x.dy)
                    .style('font-size', C.heatmap.title.x.fontSize)
                    .style('font-style', 'italic')
        }

        // render y title
        {
            let target = this.isMobile ? visGridSet.d3YTitle : visG;
            let targetHeight = this.isMobile ? heatmapAvailHeight / 2 : height / 2;

            selectOrAppend(target, 'text', '.y.title')
                .text(query.groupBy.fields[1].name)
                .attr('transform',
                    translate(0, targetHeight) + 'rotate(-90)')
                .style('text-anchor', 'middle')
                .attr('dy', C.heatmap.title.y.dy)
                .style('font-size', C.heatmap.title.y.fontSize)
                .style('font-style', 'italic')
        }

        let enter: any;

        // y labels
        {
            let target = this.isMobile ? visGridSet.d3YLabels : visG;
            let x = (this.isMobile ? yLabelWidth : (yTitleWidth + yLabelWidth)) - C.padding;

            const yLabels = target
                .selectAll('text.label.y.data')
                .data(yValues, (d: FieldGroupedValue) => d.hash);

            enter = yLabels.enter().append('text').attr('class', 'label y data')
                .style('text-anchor', 'end')
                .attr('font-size', '.8rem')

            this.yLabels = yLabels.merge(enter)
                .attr('transform', (d) => translate(x, yScale(d.hash)))
                .text(d => d.valueString())
                .attr('dy', yScale.bandwidth() / 2 + 6)

            yLabels.exit().remove();

        }

        // x labels
        {
            let target = this.isMobile ? visGridSet.d3XLabels : visG;
            let y = this.isMobile ? (heatmapXLabelHeight - C.padding / 1.4) : (headerHeight - C.padding);

            const xTopLabels = target
                .selectAll('text.label.top.x.data')
                .data(xValues, (d: FieldGroupedValue) => d.hash);

            enter = xTopLabels.enter().append('text').attr('class', 'label x top data')
                .style('text-anchor', 'start')
                .attr('font-size', '.8rem')

            this.xTopLabels = xTopLabels.merge(enter)
                .attr('transform', (d) =>
                    translate(xScale(d.hash) + xScale.bandwidth() / 2, y) + 'rotate(-45)')
                .text(d => d.valueString())

            xTopLabels.exit().remove();

            if(!this.isMobile) {
                const xBottomLabels = visG
                    .selectAll('text.label.x.bottom.data')
                    .data(xValues, (d: FieldGroupedValue) => d.hash);

                enter = xBottomLabels.enter().append('text').attr('class', 'label x bottom data')
                    .style('text-anchor', 'start')
                    .attr('font-size', '.8rem')

                this.xBottomLabels = xBottomLabels.merge(enter)
                    .attr('transform', (d) =>
                        translate(xScale(d.hash) + xScale.bandwidth() / 2, height - headerHeight + yScale.bandwidth() / 2) + 'rotate(45)')
                    .text(d => d.valueString())

                xBottomLabels.exit().remove();
            }
        }

        const xMin = (query as AggregateQuery).approximator.alwaysNonNegative ? 0 : d3.min(data, d => d.ci3.low);
        const xMax = d3.max(data, d => d.ci3.high);

        const niceTicks = d3.ticks(xMin, xMax, 8);
        const step = niceTicks[1] - niceTicks[0];
        const domainStart = (query as AggregateQuery).approximator.alwaysNonNegative ? Math.max(0, niceTicks[0] - step) : (niceTicks[0] - step);
        const domainEnd = niceTicks[niceTicks.length - 1] + step;

        if (query.domainStart > domainStart) query.domainStart = domainStart;
        if (query.domainEnd < domainEnd) query.domainEnd = domainEnd;

        let maxUncertainty = d3.max(data, d => d.ci3.stdev);

        if (query.maxUncertainty < maxUncertainty) query.maxUncertainty = maxUncertainty;
        if (maxUncertainty == 0) {
            maxUncertainty = 1;
            query.maxUncertainty = maxUncertainty;
        }

        maxUncertainty = query.maxUncertainty;

        let quant = vsup.quantization().branching(2).layers(4)
            .valueDomain([domainStart, domainEnd])
            .uncertaintyDomain([0, maxUncertainty]);

        let zScale = vsup.scale()
            .quantize(quant)
            // .range(t => viridis(1 - t));

        const rects = visG
            .selectAll('rect.area')
            .data(data, (d: any) => d.id);

        enter = rects
            .enter().append('rect').attr('class', 'area')

        rects.merge(enter)
            .attr('height', yScale.bandwidth())
            .attr('width', xScale.bandwidth())
            .attr('transform', (d) => {
                return translate(xScale(d.keys.list[0].hash), yScale(d.keys.list[1].hash))
            })
            .attr('fill', d => d.ci3 === EmptyConfidenceInterval ?
                'transparent' :
                zScale(d.ci3.center, d.ci3.high - d.ci3.center)
            );

        rects.exit().remove();


        // horizontal lines (grid)
        {
            let hls = visG.selectAll('line.horizontal')
                .data(d3.range(yValues.length + 1))

            enter = hls.enter().append('line').attr('class', 'horizontal')
                .style('stroke', 'black')
                .style('stroke-opacity', 0.1)
                .style('pointer-events', 'none')

            let baseY = this.isMobile ? 0 : headerHeight;
            hls.merge(enter)
                .attr('x1', this.isMobile ? 0 : (yTitleWidth + yLabelWidth))
                .attr('x2', this.isMobile ? heatmapFullWidth : (matrixWidth - headerHeight))
                .attr('y1', (d, i) => baseY + rowHeight * i)
                .attr('y2', (d, i) => baseY + rowHeight * i)

            hls.exit().remove();
        }

        // vertical lines (grid)
        {
            let vls = visG.selectAll('line.vertical')
                .data(d3.range(xValues.length + 1))

            enter = vls.enter().append('line').attr('class', 'vertical')
                .style('stroke', 'black')
                .style('stroke-opacity', 0.1)
                .style('pointer-events', 'none')

            let bandwidth = this.xScale.bandwidth();
            let baseX = this.isMobile ? 0 : yTitleWidth + yLabelWidth;
            vls.merge(enter)
                .attr('x1', (d, i) => baseX + bandwidth * i)
                .attr('x2', (d, i) => baseX + bandwidth * i)
                .attr('y1', this.isMobile ? 0 : headerHeight)
                .attr('y2', this.isMobile ? heatmapFullHeight : (height - headerHeight))

            vls.exit().remove();
        }

        // event boxes
        {
            let eventBoxes = this.interactionG
                .selectAll('rect.event-box')
                .data(data, (d: Datum) => d.id);

            enter = eventBoxes
                .enter().append('rect').attr('class', 'event-box variable1')

            this.eventBoxes = eventBoxes.merge(enter)
                .attr('height', yScale.bandwidth())
                .attr('width', xScale.bandwidth())
                .attr('transform', (d) => {
                    return translate(xScale(d.keys.list[0].hash), yScale(d.keys.list[1].hash))
                })
                .attr('fill', 'transparent')
                .style('cursor', (d) => d.ci3 === EmptyConfidenceInterval ? 'auto' : 'pointer')
                .on('mouseenter', (d, i) => {
                    this.showTooltip(d);

                    this.xTopLabels.filter(fgv => fgv.hash == d.keys.list[0].hash).classed('hover', true);
                    if(this.xBottomLabels) this.xBottomLabels.filter(fgv => fgv.hash == d.keys.list[0].hash).classed('hover', true);
                    this.yLabels.filter(fgv => fgv.hash == d.keys.list[1].hash).classed('hover', true);
                })
                .on('mouseleave', (d, i) => {
                    this.hideTooltip();

                    this.xTopLabels.filter(fgv => fgv.hash == d.keys.list[0].hash).classed('hover', false);
                    if(this.xBottomLabels)  this.xBottomLabels.filter(fgv => fgv.hash == d.keys.list[0].hash).classed('hover', false);
                    this.yLabels.filter(fgv => fgv.hash == d.keys.list[1].hash).classed('hover', false);
                })
                .on('click', (d, i, ele) => {
                    if (d.ci3 == EmptyConfidenceInterval) return;
                    if(this.safeguardType == SGT.Comparative) {
                        this.datumSelected2(d);
                        return;
                    }
                    this.datumSelected(d);
                    this.toggleDropdown(d, i);

                    let d3ele = d3.select(ele[i]);
                    d3ele.classed('menu-highlighted', this.vis.selectedDatum === d);

                    this.xTopLabels.filter(fgv => fgv.hash == d.keys.list[0].hash).classed('menu-highlighted', this.vis.selectedDatum === d);
                    if(this.xBottomLabels) this.xBottomLabels.filter(fgv => fgv.hash == d.keys.list[0].hash).classed('menu-highlighted', this.vis.selectedDatum === d);
                    this.yLabels.filter(fgv => fgv.hash == d.keys.list[1].hash).classed('menu-highlighted', this.vis.selectedDatum === d);
                })

            eventBoxes.exit().remove();
        }

        // legend
        {
            const legendWidth = legendSpec.width;
            const legendHeight = legendSpec.height;

            let legend = heatmapLegend()
                .scale(zScale)
                .width(legendWidth)
                .height(legendHeight)
                    .vtitle(C.locale.HeatmapLegendValue)
                    .utitle(this.isMobile ? C.locale.HeatmapLegendMobileUncertainty : C.locale.HeatmapLegendUncertainty)

            if(maxUncertainty >= 100000 || domainEnd >= 100000) {
                legend = legend.format('.2s')
            }

            let floatingSvgWrapper = d3.select(floatingSvg);
            let floatingLegend = floatingSvgWrapper.select('.legend');
            let floatingBrush = floatingSvgWrapper.select('.brush');

            let parentWidth = visGridSet.svg.parentElement.offsetWidth;
            let parentOffsetTop = 100 + headerHeight; // nativeSvg.getBoundingClientRect().top; // TODO

            floatingLegend.attr('width', legendWidth + legendSpec.paddingLeft + legendSpec.paddingRight)
                .attr('height', legendHeight + legendSpec.paddingTop + legendSpec.paddingBottom);
            floatingBrush.attr('width', legendWidth + legendSpec.paddingTop + legendSpec.paddingBottom)
                .attr('height', legendHeight + legendSpec.paddingTop + legendSpec.paddingBottom);

            d3.select(floatingSvg).style('display', 'block');

            selectOrAppend(floatingLegend, 'g', '.z.legend').selectAll('*').remove();
            selectOrAppend(floatingLegend, 'g', '.z.legend')
                .attr('transform', translate(legendSpec.paddingLeft, legendSpec.paddingTop + legendSpec.translateY))
                .append('g')
                .call(legend);

            if(this.isMobile) {
                floatingLegend.selectAll('.arc-label text')
                    .style('display', (d, i) => i % 2 ? 'none' : 'inline')

                floatingLegend.select('g.legend > text')
                    //.attr('y', 10)
            }
            else {
                floatingLegend.select('g.legend text[y="-30"]')
                    .attr('y', -40)
                if (matrixWidth + legendWidth + legendSpec.paddingTop + legendSpec.paddingBottom > parentWidth) {
                    floatingSvgWrapper
                        .style('position', 'sticky')
                        .style('left', `${parentWidth - legendWidth - legendSpec.paddingTop - legendSpec.paddingBottom}px`)
                        .style('bottom', `${C.padding}px`)
                        .style('top', 'auto')
                }
                else {
                    floatingSvgWrapper
                        .style('position', 'absolute')
                        .style('left', `${matrixWidth}px`)
                        .style('top', `${parentOffsetTop}px`)
                        .style('bottom', 'auto')
                }
            }

            this.brush.on('brush', (centerOrRange) => {
                if (this.safeguardType === SGT.Value) {
                    let constant = new ValueConstant(this.legendXScale.invert(centerOrRange));
                    this.constant = constant;
                    this.vis.constantSelected.emit(constant);
                }
                else if (this.safeguardType === SGT.Range) {
                    let [center, from, to] = centerOrRange as [number, number, number];
                    let constant = new RangeConstant(
                        this.legendXScale.invert(center),
                        this.legendXScale.invert(from),
                        this.legendXScale.invert(to));
                    this.constant = constant;
                    this.vis.constantSelected.emit(constant);
                }
            })

            let legendXScale = d3.scaleLinear().domain(quant.valueDomain())
                .range([legendSpec.paddingLeft, legendWidth + legendSpec.paddingLeft]);
            this.legendXScale = legendXScale;

            if (this.safeguardType == SGT.Value || this.safeguardType === SGT.Range) {
                this.brush.render([
                    [legendSpec.paddingLeft, legendSpec.paddingTop + legendSpec.translateY],
                    [legendWidth + legendSpec.paddingLeft, legendHeight + legendSpec.paddingTop + legendSpec.translateY]]);
            }

            if (!this.constant) this.setDefaultConstantFromVariable();

            if ([SGT.Value, SGT.Range].includes(this.safeguardType) && this.constant)
                this.brush.show();
            else
                this.brush.hide();

            if(this.variable1 && this.safeguardType === SGT.Value) {
                let d = this.getDatum(this.variable1);
                this.brush.setReferenceValue(this.legendXScale(d.ci3.center));

                if(this.constant) {
                    let center = this.legendXScale((this.constant as ValueConstant).value);
                    this.brush.move(center);
                }
            }
            else if(this.variable1 && this.safeguardType == SGT.Range) {
                let d = this.getDatum(this.variable1);
                this.brush.setReferenceValue(this.legendXScale(d.ci3.center));
                this.brush.setCenter(this.legendXScale(d.ci3.center));

                if(this.constant) {
                    let oldRange: Range = (this.constant as RangeConstant).range;
                    let half = (oldRange[1] - oldRange[0]) / 2;
                    let newCenter = this.getDatum(this.variable1).ci3.center;
                    let domain = this.legendXScale.domain();

                    if(newCenter - half < domain[0]) { half = newCenter - domain[0]; }
                    if(newCenter + half > domain[1]) { half = Math.min(half, domain[1] - newCenter); }

                    let constant = new RangeConstant(newCenter, newCenter - half, newCenter + half);
                    this.vis.constantSelected.emit(constant);
                    this.constantUserChanged(constant); // calls brush.move
                }
            }

            if (this.safeguardType === SGT.Linear) {
                this.linearLine.show();
                this.linearLine.render(
                    this.constant as LinearConstant,
                    xKeys,
                    yKeys,
                    xScale,
                    yScale
                );
            }
            else {
                this.linearLine.hide();
            }
        }

        // minimap

        let d3minimap = d3.select(minimap);
        let d3minisvg = d3minimap.select('svg');

        let xCount = xValues.length;
        let yCount = yValues.length;

        let blockWidth = Math.min(Math.floor(C.heatmap.minimap.maxWidth / xCount), Math.floor(C.heatmap.minimap.maxHeight / yCount
            / rowHeight * columnWidth))
        let blockHeight = blockWidth * rowHeight / columnWidth;

        if(this.isMobile) {
            d3minisvg
                .attr('width', blockWidth * xValues.length)
                .attr('height', blockHeight * yValues.length)

            let g = selectOrAppend(d3minisvg, 'g', '.blocks');

            const rects =
                g.selectAll('rect.area')
                .data(data, (d: any) => d.id);

            enter = rects
                .enter().append('rect').attr('class', 'area')

            const miniXScale = d3.scaleBand().domain(xValues.map(d => d.hash))
                .range([0, blockWidth * xValues.length]);

            const miniYScale = d3.scaleBand().domain(yValues.map(d => d.hash))
                .range([0, blockHeight * yValues.length]);

            rects.merge(enter)
                .attr('width', miniXScale.bandwidth())
                .attr('height', miniYScale.bandwidth())
                .attr('transform', (d) => {
                    return translate(miniXScale(d.keys.list[0].hash), miniYScale(d.keys.list[1].hash))
                })
                .attr('fill', d => d.ci3 === EmptyConfidenceInterval ?
                    'transparent' :
                    zScale(d.ci3.center, d.ci3.high - d.ci3.center)
                );

            rects.exit().remove();

            let brush = d3.brush().handleSize(0);
            this.minimapBrush = brush;

            let left = visGridSet.svg.parentElement.scrollLeft,
                top = visGridSet.svg.parentElement.scrollTop;

            let wrapper = selectOrAppend(d3minisvg, 'g', '.brush-wrapper')
                .call(brush)
                .call(brush.move, [[
                        left / columnWidth * blockWidth,
                        top / rowHeight * blockHeight,
                    ], [
                        left / columnWidth * blockWidth + heatmapAvailWidth / columnWidth * blockWidth,
                        top / rowHeight * blockHeight + heatmapAvailHeight / rowHeight * blockHeight,
                    ]])

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
                            .call(this.minimapBrush.move, [[
                                left / columnWidth * blockWidth,
                                top / rowHeight * blockHeight,
                            ], [
                                left / columnWidth * blockWidth + heatmapAvailWidth / columnWidth * blockWidth,
                                top / rowHeight * blockHeight + heatmapAvailHeight / rowHeight * blockHeight,
                            ]]);

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
                visGridSet.svg.parentElement.scrollLeft = x0 / blockWidth * columnWidth;
                visGridSet.svg.parentElement.scrollTop = y0 / blockHeight * rowHeight;
                xyFromSvg = true;
            })
        }
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
        }
        else if (st == SGT.Value) {
            this.brush.setMode(BrushMode.Point);
        }
        else if (st === SGT.Range) {
            this.brush.setMode(BrushMode.SymmetricRange);
        }
        else if (st === SGT.Comparative) {
        }
    }

    updateHighlight() {
        this.eventBoxes
            .classed('stroke-highlighted', false)
            .filter((d) =>
                this.variable1 && this.variable1.hash === d.keys.hash ||
                this.variable2 && this.variable2.hash === d.keys.hash
            )
            .classed('stroke-highlighted', true)

        this.xTopLabels
            .classed('highlighted', false)
            .filter((d) => (this.variable1 && this.variable1.first.fieldGroupedValue.hash === d.hash) ||
                    (this.variable2 && this.variable2.first.fieldGroupedValue.hash === d.hash)
            )
            .classed('highlighted', true)

        if(this.xBottomLabels)
        this.xBottomLabels
            .classed('highlighted', false)
            .filter((d) => (this.variable1 && this.variable1.first.fieldGroupedValue.hash === d.hash) ||
                    (this.variable2 && this.variable2.first.fieldGroupedValue.hash === d.hash)
            )
            .classed('highlighted', true)

        this.yLabels
            .classed('highlighted', false)
            .filter((d) => (this.variable1 && this.variable1.second.fieldGroupedValue.hash === d.hash) ||
                    (this.variable2 && this.variable2.second.fieldGroupedValue.hash === d.hash)
            )
            .classed('highlighted', true)

        this.eventBoxes
            .classed('variable2', false)
            .filter((d) => this.variable2 && this.variable2.hash === d.keys.hash)
            .classed('variable2', true)

        this.xTopLabels
            .classed('variable2', false)
            .filter((d) => this.variable2 && this.variable2.first.fieldGroupedValue.hash === d.hash)
            .classed('variable2', true)

        if(this.xBottomLabels)
        this.xBottomLabels
            .classed('variable2', false)
            .filter((d) => this.variable2 && this.variable2.first.fieldGroupedValue.hash === d.hash)
            .classed('variable2', true)

        this.yLabels
            .classed('variable2', false)
            .filter((d) => this.variable2 && this.variable2.second.fieldGroupedValue.hash === d.hash)
            .classed('variable2', true)
    }

    /* invoked when a constant is selected indirectly (by clicking on a category) */
    constantUserChanged(constant: ConstantTrait) {
        this.constant = constant;
        if (this.safeguardType === SGT.Value) {
            let center = this.legendXScale((constant as ValueConstant).value);
            this.brush.show();
            this.brush.move(center);
        }
        else if (this.safeguardType === SGT.Range) {
            let range = (constant as RangeConstant).range.map(this.legendXScale) as [number, number];
            this.brush.show();
            this.brush.move(range);
        }
    }

    getDatum(variable: CombinedVariable): Datum {
        return this.data.find(d => d.id === variable.hash);
    }

    getRank(variable: CombinedVariable): number {
        for (let i = 0; i < this.data.length; i++) {
            if (this.data[i].id == variable.hash) return i + 1;
        }
        return 1;
    }

    datumSelected(d: Datum) {
        if (![SGT.Value, SGT.Range, SGT.Comparative].includes(this.safeguardType)) return;

        this.logger.log(LogType.DatumSelected, {
            datum: d.toLog(),
            data: this.data.map(d => d.toLog())
        });

        let variable = new CombinedVariable(
            new SingleVariable(d.keys.list[0]),
            new SingleVariable(d.keys.list[1]));
        if (this.variable2 && variable.hash === this.variable2.hash) return;
        this.variable1 = variable;

        if (this.safeguardType === SGT.Value) {
            this.brush.setReferenceValue(this.legendXScale(d.ci3.center));
        }
        else if (this.safeguardType === SGT.Range) {
            this.brush.setCenter(this.legendXScale(d.ci3.center));
            this.brush.setReferenceValue(this.legendXScale(d.ci3.center));
        }
        this.updateHighlight();

        this.vis.variableSelected.emit({ variable: variable });
        this.setDefaultConstantFromVariable(true);
    }

    datumSelected2(d: Datum) {
        if (this.safeguardType != SGT.Comparative) return;
        d3.event.preventDefault();

        this.logger.log(LogType.DatumSelected, {
            datum: d.toLog(),
            data: this.data.map(d => d.toLog())
        });

        let variable = new CombinedVariable(
            new SingleVariable(d.keys.list[0]),
            new SingleVariable(d.keys.list[1]));

        if (this.variable1 && variable.hash === this.variable1.hash)
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
            else if (this.safeguardType === SGT.Range) {
                let range = this.getDatum(this.variable1).ci3;
                let constant = new RangeConstant(range.center, range.low, range.high);

                if (range.low < 0) constant = new RangeConstant(range.center, 0, range.high + range.low);
                this.vis.constantSelected.emit(constant);
                this.constantUserChanged(constant);
            }
        }
        else if (this.safeguardType === SGT.Linear) {
            let constant = LinearConstant.FitFromVisData(this.query.getVisibleData(), 0, 1);
            this.vis.constantSelected.emit(constant);
            this.constantUserChanged(constant);
        }
    }

    showTooltip(d: Datum) {
        if(d.ci3 === EmptyConfidenceInterval) return;

        const clientRect = this.nativeSvg.getBoundingClientRect();
        const parentRect = this.nativeSvg.parentElement
            .parentElement
            .parentElement.getBoundingClientRect();

        let data = {
            query: this.query,
            datum: d
        };

        this.tooltip.show(
            clientRect.left - parentRect.left + this.xScale(d.keys.list[0].hash) +
            this.xScale.bandwidth() / 2,
            clientRect.top - parentRect.top + this.yScale(d.keys.list[1].hash),
            HeatmapTooltipComponent,
            data
        );
    }

    hideTooltip() {
        if(this.tooltip.visible) this.tooltip.hide();
    }

    toggleDropdown(d: Datum, i: number) {
        d3.event.stopPropagation();

        if ([SGT.Value, SGT.Range, SGT.Comparative].includes(this.safeguardType)) return;
        if (this.vis.isDropdownVisible || this.vis.isQueryCreatorVisible) {
            this.closeDropdown();
            return;
        }

        if (d == this.vis.selectedDatum) { // double click the same item
            this.closeDropdown();
        }
        else {
            this.openDropdown(d);
            return;
        }
    }

    openDropdown(d: Datum) {
        this.vis.selectedDatum = d;

        const clientRect = this.nativeSvg.getBoundingClientRect();
        const parentRect = this.nativeSvg.parentElement // wrapper
            .parentElement // vis-grid
            .parentElement // vis
            .getBoundingClientRect();

        let i = this.data.indexOf(d);
        let top = clientRect.top - parentRect.top
            + this.yScale(d.keys.list[1].hash) + this.yScale.bandwidth();

        this.vis.isDropdownVisible = true;
        this.vis.dropdownTop = top;
        this.vis.dropdownLeft = this.xScale(d.keys.list[0].hash) + this.xScale.bandwidth();
    }

    closeDropdown() {
        this.vis.emptySelectedDatum();
        this.vis.isQueryCreatorVisible = false;
        this.vis.isDropdownVisible = false;
    }

    openQueryCreator(d: Datum) {
        if (this.safeguardType != SGT.None) return;

        const clientRect = this.nativeSvg.getBoundingClientRect();
        const parentRect = this.nativeSvg.parentElement.getBoundingClientRect();

        let i = this.data.indexOf(d);
        let left = clientRect.left - parentRect.left
            + this.xScale(d.keys.list[0].hash) + this.xScale.bandwidth() / 2;
        let top = clientRect.top - parentRect.top + this.yScale(d.keys.list[1].hash);

        this.vis.isQueryCreatorVisible = true;
        this.vis.queryCreatorTop = top;
        this.vis.queryCreatorLeft = left;

        let where: Predicate = this.vis.query.where;
        // where + datum

        this.vis.queryCreator.where = where ? where.and(this.query.getPredicateFromDatum(d))
            : new AndPredicate([this.query.getPredicateFromDatum(d)]);
    }

    closeQueryCreator() {
        this.vis.isQueryCreatorVisible = false;
    }

    emptySelectedDatum() {
        this.eventBoxes.classed('menu-highlighted', false);
        this.xTopLabels.classed('menu-highlighted', false);
        if(this.xBottomLabels) this.xBottomLabels.classed('menu-highlighted', false);
        this.yLabels.classed('menu-highlighted', false);
    }
}
