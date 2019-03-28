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
import { ConstantTrait, RankConstant, ValueConstant, RangeRankConstant, RangeConstant, PowerLawConstant, DistributionTrait, NormalConstant } from '../../safeguard/constant';
import { Brush, BrushDirection, BrushMode } from './brush';
import { DistributionLine } from './distribution-line';
import { AndPredicate } from '../../data/predicate';
import { Datum } from '../../data/datum';
import { AggregateQuery } from '../../data/query';
import { LoggerService, LogType } from '../../services/logger.service';
import { EmptyConfidenceInterval, ConfidencePoint } from '../../data/confidence-interval';

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

    constructor(public vis: VisComponent, public tooltip: TooltipComponent, public logger:LoggerService) {
    }

    setup(query: AggregateQuery, nativeSvg: SVGSVGElement, floatingSvg: HTMLDivElement) {
        if (query.groupBy.fields.length > 1) {
            throw 'HorizontalBars can be used up to 1 groupBy';
        }

        let svg = d3.select(nativeSvg);

        this.gradient.setup(selectOrAppend(svg, 'defs'));
        this.visG = selectOrAppend(svg, 'g', 'vis');

        this.visG.classed('bars', true);
        this.query = query;
        this.nativeSvg = nativeSvg;

        this.interactionG = selectOrAppend(svg, 'g', 'interaction');
        this.brush.setup(this.interactionG);
        this.distributionLine.setup(this.interactionG);
    }

    render(query: AggregateQuery, nativeSvg: SVGSVGElement, floatingSvg: HTMLDivElement) {
        let svg = d3.select(nativeSvg);
        let done = query.visibleProgress.done();
        let visG = svg.select('g.vis');
        let data = query.getVisibleData();

        this.data = data;

        if (this.limitNumCategories) {
            data = data.slice(0, C.bars.initiallyVisibleCategories);
        }

        const height = C.bars.axis.height * 2 +
            C.bars.height * data.length + C.bars.label.height * 2;
        const width = 800;

        svg.attr('width', width).attr('height', height)
            .on('contextmenu', () => d3.event.preventDefault());

        let labelStrings = data.map(d => d.keys.list[0].valueString());
        let maxLabelWidth = labelStrings.length > 0 ? d3.max(labelStrings, l => measure(l, '.8rem').width) : 0;

        // 30 = rank + space
        // 10 = ~
        const labelWidth =
            Math.max(labelStrings.length > 0 ? (maxLabelWidth + (query.isRankAvailable ? 30 : 10)) : 0 + C.padding,
                measure(query.groupBy.fields[0].name, '.8rem').width + (query.isRankAvailable ? 30 : 10)
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
            .range([C.bars.axis.height + C.bars.label.height,
            height - C.bars.axis.height - C.bars.label.height])
            .padding(0.1);


        this.xScale = xScale;
        this.yScale = yScale;

        const majorTickLines = d3.axisTop(xScale).tickSize(-(height - 2 * C.bars.axis.height - 2 * C.bars.label.height));

        // render top and bottom labels
        {
            let xLabelTitle = Constants.locale.COUNT;
            if(query.target) xLabelTitle = Constants.locale.XLabelTitleFormatter(query);

            // x labels
            selectOrAppend(visG, 'text', '.x.field.label.top')
                .text(xLabelTitle)
                .attr('transform', translate((width - labelWidth - C.padding) / 2 + labelWidth, 0))
                .style('text-anchor', 'middle')
                .attr('dy', '.8em')
                .style('font-size', '.8em')
                .style('font-style', 'italic')

            selectOrAppend(visG, 'text', '.x.field.label.bottom')
                .text(xLabelTitle)
                .attr('transform', translate((width - labelWidth - C.padding) / 2 + labelWidth, height - C.bars.axis.height))
                .style('text-anchor', 'middle')
                .attr('dy', '1.3em')
                .style('font-size', '.8em')
                .style('font-style', 'italic')

            // y labels
            selectOrAppend(visG, 'text', '.y.field.label')
                .text(query.groupBy.fields[0].name)
                .attr('transform', translate(labelWidth - C.padding, C.bars.label.height))
                .style('text-anchor', 'end')
                .attr('dy', '1.2em')
                .style('font-size', '.8rem')
                .style('font-style', 'italic')
        }

        // render major ticks
        {
            selectOrAppend(visG, 'g', '.sub.axis')
                .style('opacity', .2)
                .attr('transform', translate(0, C.bars.axis.height + C.bars.label.height))
                .transition()
                .call(majorTickLines as any)
                .selectAll('text')
                .style('display', 'none')
        }

        // render the top axis
        {
            const topAxis = d3.axisTop(xScale).tickFormat(d3.format('~s'));

            selectOrAppend(visG, 'g', '.x.axis.top')
                .attr('transform', translate(0, C.bars.axis.height + C.bars.label.height))
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
                    d3.select(ele[i]).classed('hover', true);
                })
                .on('mouseleave', (d, i, ele) => {
                    this.hideTooltip(d, i);
                    d3.select(ele[i]).classed('hover', false);
                })
                .on('click', (d, i, ele) => {
                    this.datumSelected(d);
                    this.toggleDropdown(d, i);

                    let d3ele = d3.select(ele[i]);
                    d3ele.classed('menu-highlighted', this.vis.selectedDatum === d);
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
                .attr('width', d => xScale(d.ci3.high) - xScale(d.ci3.low))
                .attr('transform', (d, i) => translate(xScale(d.ci3.low), yScale(i + '')))
                .style('fill', 'transparent')
                .on('mouseenter', (d, i) => {
                    this.showTooltip(d, i);
                    this.labels.filter(datum => datum == d).classed('hover', true);
                })
                .on('mouseleave', (d, i) => {
                    this.hideTooltip(d, i);
                    this.labels.filter(datum => datum == d).classed('hover', false);
                })
                .on('click', (d, i) => {
                    if(d.ci3 == EmptyConfidenceInterval) return;
                    this.datumSelected(d);
                    this.toggleDropdown(d, i);

                    this.labels.filter(datum => datum == d).classed('menu-highlighted', this.vis.selectedDatum === d);
                })
                .on('contextmenu', (d) => this.datumSelected2(d))


            barEventBoxes.exit().remove();
        }

        // render the bottom axis
        {
            const bottomAxis = d3.axisBottom(xScale).tickFormat(d3.format('~s'));

            selectOrAppend(visG, 'g', '.x.axis.bottom')
                .attr('transform', translate(0, height - C.bars.axis.height - C.bars.label.height))
                .transition()
                .call(bottomAxis as any)
        }

        d3.select(floatingSvg).style('display', 'none');

        this.brush.on('brush', (centerOrRange) => {
            if (this.safeguardType === SGT.Value) {
                let constant = new ValueConstant(this.xScale.invert(centerOrRange));
                this.constant = constant;
                this.vis.constantSelected.emit(constant);
            }
            else if (this.safeguardType === SGT.Rank) {
                let index = Math.round((centerOrRange - C.bars.axis.height - C.bars.label.height)
                    / C.bars.height)
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
            this.brush.render([[labelWidth, C.bars.axis.height - C.padding],
            [width - C.padding, height - C.bars.axis.height + C.padding]]);
        }
        else if(this.safeguardType === SGT.Rank) {
            let start = yScale.range()[0];
            let step = C.bars.height;

            this.brush.setDirection(BrushDirection.Y);
            this.brush.hideReferenceLine();
            this.brush.snap = d => {
                let index = Math.round((d - start) / step);
                return Math.max(1, index) * step + start;
            };

            this.brush.render([[0, yScale.range()[0]],
            [width, yScale.range()[1]]]);
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
        const parentRect = this.nativeSvg.parentElement.getBoundingClientRect();

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

    hideTooltip(d: Datum, i: number) {
        this.tooltip.hide();
        if ([SGT.Value, SGT.Rank, SGT.Range, SGT.Comparative].includes(this.safeguardType)) {
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
        const parentRect = this.nativeSvg.parentElement.getBoundingClientRect();

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
        const parentRect = this.nativeSvg.parentElement.getBoundingClientRect();

        let i = this.data.findIndex(datum => datum.id === d.id);

        let top = clientRect.top - parentRect.top + this.yScale(i + '')
            + C.bars.label.height + C.padding;

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
        this.labels.classed('menu-highlighted', false);
    }
}
