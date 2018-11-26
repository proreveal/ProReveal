import * as d3 from 'd3';
import { ExplorationNode } from '../../exploration/exploration-node';
import { VisConstants as VC } from '../vis-constants';
import * as util from '../../util';
import { AggregateQuery, Datum, Histogram2DQuery } from '../../data/query';
import { measure } from '../../d3-utils/measure';
import { translate, selectOrAppend } from '../../d3-utils/d3-utils';
import { FieldGroupedValue, QuantitativeField } from '../../data/field';
import { Renderer } from './renderer';
import { TooltipComponent } from '../../tooltip/tooltip.component';
import * as vsup from 'vsup';
import { VisComponent } from '../vis.component';
import { FittingTypes, ConstantTrait, PointValueConstant, RangeValueConstant } from '../../safeguard/constant';
import { SafeguardTypes as SGT } from '../../safeguard/safeguard';
import { VariableTypes as VT, CombinedVariable } from '../../safeguard/variable';
import { FlexBrush, FlexBrushDirection, FlexBrushMode } from './brush';

export class PunchcardRenderer implements Renderer {
    constructor(public vis: VisComponent, public tooltip: TooltipComponent
    ) {
    }

    data: Datum[];
    variable1: CombinedVariable;
    variable2: CombinedVariable;
    node: ExplorationNode;
    nativeSvg: SVGSVGElement;
    swatchXScale: d3.ScaleLinear<number, number>;
    flexBrush = new FlexBrush<Datum>(FlexBrushDirection.X, FlexBrushMode.Point, {
        yResize: 0.8
    });

    variableHighlight: d3.Selection<d3.BaseType, {}, null, undefined>;
    variableHighlight2: d3.Selection<d3.BaseType, {}, null, undefined>;
    eventRects: d3.Selection<d3.BaseType, Datum, d3.BaseType, {}>;
    swatch: d3.Selection<d3.BaseType, Datum, d3.BaseType, {}>;
    visG;
    interactionG;

    setup(node: ExplorationNode, nativeSvg: SVGSVGElement) {
        if ((node.query as AggregateQuery).groupBy.fields.length !== 2) {
            throw 'Punchcards can be used for 2 categories!';
        }

        let svg = d3.select(nativeSvg);

        this.visG = selectOrAppend(svg, 'g', 'vis');

        this.node = node;
        this.nativeSvg = nativeSvg;

        this.interactionG = selectOrAppend(svg, 'g', 'interaction');
        this.flexBrush.setup(this.interactionG);
        //this.distributionLine.setup(this.interactionG);
    }

    render(node: ExplorationNode, nativeSvg: SVGSVGElement) {
        let query = node.query as AggregateQuery;
        let visG = d3.select(nativeSvg).select('g.vis');

        let data = query.resultData();
        this.data = data;

        let yKeys = {}, xKeys = {};
        let yKeyIndex = 0, xKeyIndex = 1;

        data.forEach(row => {
            yKeys[row.keys.list[0].hash] = row.keys.list[0];
            xKeys[row.keys.list[1].hash] = row.keys.list[1];
        });

        if (d3.values(xKeys).length > d3.values(yKeys).length)
            [yKeyIndex, xKeyIndex] = [xKeyIndex, yKeyIndex];

        let xValues: FieldGroupedValue[] = d3.values(xKeyIndex === 1 ? xKeys : yKeys);
        let yValues: FieldGroupedValue[] = d3.values(yKeyIndex === 0 ? yKeys : xKeys);

        if (this.node.query instanceof Histogram2DQuery) {
            let sortFunc = (a: FieldGroupedValue, b: FieldGroupedValue) => {
                let av = a.value(), bv = b.value();
                let ap = av ? av[0] as number : (a.field as QuantitativeField).max;
                let bp = bv ? bv[0] as number: (b.field as QuantitativeField).max;

                return ap - bp;
            }
            xValues.sort(sortFunc)
            yValues.sort(sortFunc);
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

            xValues.sort((a, b) => weight[b.hash] - weight[a.hash]);
            yValues.sort((a, b) => weight[b.hash] - weight[a.hash]);
        }

        let [, yLongest,] = util.amax(yValues, d => d.valueString().length);
        const yLabelWidth = yLongest ? measure(yLongest.valueString()).width : 0;

        let [, xLongest,] = util.amax(xValues, d => d.valueString().length);
        const xLabelWidth = xLongest ? measure(xLongest.valueString()).width : 0;

        const header = 1.414 / 2 * (VC.punchcard.columnWidth + xLabelWidth)
        const height = VC.punchcard.rowHeight * yValues.length + header;

        const matrixWidth = xValues.length > 0 ? (yLabelWidth + VC.punchcard.columnWidth * (xValues.length - 1) + header) : 0;
        const width = matrixWidth + VC.punchcard.legendSize * 1.2;

        d3.select(nativeSvg).attr('width', width).attr('height', height);

        const xScale = d3.scaleBand().domain(xValues.map(d => d.hash))
            .range([yLabelWidth, matrixWidth - header]);

        const yScale = d3.scaleBand().domain(yValues.map(d => d.hash))
            .range([header, height]);

        const yLabels = visG
            .selectAll('text.label.y')
            .data(yValues, (d: FieldGroupedValue) => d.hash);

        let enter: any = yLabels.enter().append('text').attr('class', 'label y')
            .style('text-anchor', 'end')
            .attr('font-size', '.8rem')
            .attr('dy', '.8rem')

        yLabels.merge(enter)
            .attr('transform', (d) => translate(yLabelWidth - VC.padding, yScale(d.hash)))
            .text(d => d.valueString())

        yLabels.exit().remove();

        const xLabels = visG
            .selectAll('text.label.x')
            .data(xValues, (d: FieldGroupedValue) => d.hash);

        enter = xLabels.enter().append('text').attr('class', 'label x')
            .style('text-anchor', 'start')
            .attr('font-size', '.8rem')

        xLabels.merge(enter)
            .attr('transform', (d) => translate(xScale(d.hash) + xScale.bandwidth() / 2, header - VC.padding) + 'rotate(-45)')
            .text(d => d.valueString())

        xLabels.exit().remove();

        const xLabelLines = visG.selectAll('line.label.x')
            .data(xValues, (d: FieldGroupedValue) => d.hash);

        enter = xLabelLines.enter().append('line').attr('class', 'label x')
            .style('stroke', 'black')
            .style('opacity', 0.2);

        xLabelLines.merge(enter)
            .attr('x1', (d) => xScale(d.hash) + xScale.bandwidth() / 2)
            .attr('x2', (d) => xScale(d.hash) + xScale.bandwidth() / 2)
            .attr('y1', yScale.range()[0])
            .attr('y2', yScale.range()[1])

        xLabelLines.exit().remove();

        const yLabelLines = visG.selectAll('line.label.y')
            .data(yValues, (d: FieldGroupedValue) => d.hash);

        enter = yLabelLines.enter().append('line').attr('class', 'label y')
            .style('stroke', 'black')
            .style('opacity', 0.2);

        yLabelLines.merge(enter)
            .attr('x1', xScale.range()[0])
            .attr('x2', xScale.range()[1])
            .attr('y1', (d) => yScale(d.hash) + yScale.bandwidth() / 2)
            .attr('y2', (d) => yScale(d.hash) + yScale.bandwidth() / 2)

        yLabelLines.exit().remove();

        const rects = visG
            .selectAll('rect.area')
            .data(data, (d: any) => d.id);

        enter = rects
            .enter().append('rect').attr('class', 'area')

        const xMin = (query as AggregateQuery).approximator.alwaysNonNegative ? 0 : d3.min(data, d => d.ci3.low);
        const xMax = d3.max(data, d => d.ci3.high);

        const niceTicks = d3.ticks(xMin, xMax, 8);
        const step = niceTicks[1] - niceTicks[0];
        const domainStart = (query as AggregateQuery).approximator.alwaysNonNegative ? Math.max(0, niceTicks[0] - step) : (niceTicks[0] - step);
        const domainEnd = niceTicks[niceTicks.length - 1] + step;

        if (node.domainStart > domainStart) node.domainStart = domainStart;
        if (node.domainEnd < domainEnd) node.domainEnd = domainEnd;

        let maxUncertainty = d3.max(data, d => d.ci3.high - d.ci3.center);

        if (node.maxUncertainty < maxUncertainty) node.maxUncertainty = maxUncertainty;

        maxUncertainty = node.maxUncertainty;

        let quant = vsup.quantization().branching(2).layers(4)
            .valueDomain([domainStart, domainEnd])
            .uncertaintyDomain([0, maxUncertainty]);

        let zScale = vsup.scale()
            .quantize(quant)
            .range(d3.interpolateViridis);

        rects.merge(enter)
            .attr('height', yScale.bandwidth())
            .attr('width', xScale.bandwidth())
            .attr('transform', (d) => {
                return translate(xScale(d.keys.list[xKeyIndex].hash), yScale(d.keys.list[yKeyIndex].hash))
            })
            .attr('fill', d => zScale(d.ci3.center, d.ci3.high - d.ci3.center));

        rects.exit().remove();

        const eventRects = visG
            .selectAll('rect.event.variable1')
            .data(data, (d: any) => d.id);

        enter = eventRects
            .enter().append('rect').attr('class', 'event variable1')

        eventRects.merge(enter)
            .attr('height', yScale.bandwidth())
            .attr('width', xScale.bandwidth())
            .attr('transform', (d) => {
                return translate(xScale(d.keys.list[xKeyIndex].hash), yScale(d.keys.list[yKeyIndex].hash))
            })
            .attr('fill', 'transparent')
            .style('cursor', 'pointer')
            .on('click', (d) => this.datumSelected(d))
            .on('contextmenu', (d) => this.datumSelected2(d))

        eventRects.exit().remove();

        this.eventRects = eventRects;

        let legend = vsup.legend.arcmapLegend().scale(zScale).size(VC.punchcard.legendSize);

        selectOrAppend(visG, 'g', '.z.legend').selectAll('*').remove();
        selectOrAppend(visG, 'g', '.z.legend')
            .attr('transform', translate(matrixWidth, 50))
            .append('g')
            .call(legend);

        let swatch = selectOrAppend(visG, 'g', '.swatch')
            .attr('transform', translate(0, VC.punchcard.legendSize * 1.5))
        let numSamples = 128;
        let swatchData = d3.range(numSamples).map(d => matrixWidth + d * VC.punchcard.legendSize / numSamples)

        this.swatchXScale = d3.scaleLinear<number>()
            .domain([matrixWidth, matrixWidth + VC.punchcard.legendSize])
            .range([domainStart, domainEnd])

        let samples = swatch.selectAll('rect').data(swatchData);

        samples.enter().append('rect').merge(samples)
            .attr('x', (d) => d)
            .attr('width', VC.punchcard.legendSize / numSamples)
            .attr('height', VC.punchcard.swatchHeight)
            .attr('fill', (d) => zScale(this.swatchXScale(d), 0))
            .style('shape-rendering', 'crispEdges')

        let swatchAxis = d3.axisBottom(d3.scaleLinear<number>()
            .domain(this.swatchXScale.range())
            .range(this.swatchXScale.domain()));

        selectOrAppend(swatch, 'g', '.axis')
            .attr('transform', translate(0, VC.punchcard.swatchHeight))
            .call(swatchAxis)

        this.variableHighlight =
            selectOrAppend(visG, 'rect', '.variable1.highlighted')
                .attr('width', matrixWidth - header - yLabelWidth)
                .attr('height', height - header)
                .attr('transform', translate(yLabelWidth, header))
                .attr('display', 'none')
                .style('pointer-events', 'none')

        this.variableHighlight2 =
            selectOrAppend(visG, 'rect', '.variable2.highlighted')
                .attr('width', matrixWidth - header - yLabelWidth)
                .attr('height', height - header)
                .attr('transform', translate(yLabelWidth, header))
                .attr('display', 'none')
                .style('pointer-events', 'none')

        this.flexBrush.on('brush', () => {
            if (this.safeguardType === SGT.Point/* && this.variableType === VT.Value*/) {
                let sel = d3.event.selection;
                let center = (sel[0] + sel[1]) / 2;
                let constant = new PointValueConstant(this.swatchXScale(center));
                this.constant = constant;
                this.vis.constantSelected.emit(constant);
            }
            /*else if (this.safeguardType === SGT.Point && this.variableType === VT.Rank) {
                let sel = d3.event.selection;
                let center = (sel[0] + sel[1]) / 2;
                let index = Math.round((center - VC.horizontalBars.axis.height) / VC.horizontalBars.height)
                let constant = new PointRankConstant(index);
                this.constant = constant;
                this.vis.constantSelected.emit(constant);
            }*/
            else if (this.safeguardType === SGT.Range/* && this.variableType === VT.Value*/) {
                let sel = d3.event.selection;
                let constant = new RangeValueConstant(this.swatchXScale(sel[0]), this.swatchXScale(sel[1]));
                this.constant = constant;
                this.vis.constantSelected.emit(constant);
            }
            /*else if (this.safeguardType === SGT.Range && this.variableType === VT.Rank) {
                let sel = d3.event.selection;
                let index1 = Math.round((sel[0] - VC.horizontalBars.axis.height) / VC.horizontalBars.height)
                let index2 = Math.round((sel[1] - VC.horizontalBars.axis.height) / VC.horizontalBars.height)
                let constant = new RangeRankConstant(index1, index2);
                this.constant = constant;
                this.vis.constantSelected.emit(constant);
            }*/

            // ADD CODE FOR SGS
        })

        if (this.variableType == VT.Value) {
            this.flexBrush.snap = null;

            this.flexBrush.setDirection(FlexBrushDirection.X);
            this.flexBrush.render([[matrixWidth, VC.punchcard.legendSize * 1.5],
            [matrixWidth + VC.punchcard.legendSize, VC.punchcard.legendSize * 1.5 + VC.punchcard.swatchHeight]]);
        }
        else if (false) {
            // we can't do about ranking
            // let start = VC.horizontalBars.axis.height;
            // let step = VC.horizontalBars.height;

            // this.flexBrush.setDirection(FlexBrushDirection.Y);
            // this.flexBrush.snap = d => {
            //     return Math.round((d - start) / step) * step + start;
            // };

            // this.flexBrush.render([[0, VC.horizontalBars.axis.height],
            // [width, height - VC.horizontalBars.axis.height]]);
        }

        if (!this.constant) this.setDefaultConstantFromVariable();

        if ([SGT.Point, SGT.Range].includes(this.safeguardType) && this.constant)
            this.flexBrush.show();
        else
            this.flexBrush.hide();

        if (this.constant) {
            if (this.safeguardType === SGT.Point/* && this.variableType === VT.Value*/) {
                let center = this.swatchXScale.invert((this.constant as PointValueConstant).value);
                this.flexBrush.move(center);
            }
            /*else if (this.safeguardType === SGT.Point && this.variableType === VT.Rank) {
                let center = yScale((this.constant as PointRankConstant).rank.toString());
                this.flexBrush.move(center);
            }*/
            else if (this.safeguardType === SGT.Range/* && this.variableType === VT.Value*/) {
                let range = (this.constant as RangeValueConstant).range.map(this.swatchXScale.invert) as [number, number];
                this.flexBrush.move(range);
            }
            /*else if (this.safeguardType === SGT.Range && this.variableType === VT.Rank) {
                let range = (this.constant as RangeRankConstant).range.map(d => this.yScale(d.toString())) as [number, number];
                this.flexBrush.move(range);
            }*/
        }
    }

    highlight(highlighted: number) {
        this.variableHighlight.attr('display', 'none')
        this.variableHighlight2.attr('display', 'none')
        //this.constantHighlight.style('opacity', 0)

        if (highlighted == 1) {
            this.variableHighlight.attr('display', 'inline')
        }
        else if (highlighted == 2) {

        }
        else if (highlighted == 3) {
        }
        else if (highlighted == 4) {
            this.variableHighlight2.attr('display', 'inline')
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
            this.eventRects.style('display', 'none');
        }
        else if (st == SGT.Point) {
            this.eventRects.style('display', 'inline');
            this.flexBrush.setMode(FlexBrushMode.Point);
        }
        else if (st === SGT.Range) {
            this.eventRects.style('display', 'inline');
            this.flexBrush.setMode(FlexBrushMode.SymmetricRange);
        }
        else if (st === SGT.Comparative) {
            this.eventRects.style('display', 'inline');
        }
    }

    variableType: VT;
    setVariableType(vt: VT) {
        this.variableType = vt;

        this.constant = null;
    }

    setFittingType(type: FittingTypes) {

    }

    updateHighlight() {
        this.eventRects
            .classed('stroke-highlighted', false)
            .filter((d) =>
                this.variable1 && this.variable1.hash === d.keys.hash ||
                this.variable2 && this.variable2.hash === d.keys.hash
            )
            .classed('stroke-highlighted', true)

        this.eventRects
            .classed('variable2', false)
            .filter((d) => this.variable2 && this.variable2.hash === d.keys.hash)
            .classed('variable2', true)
    }

    /* invoked when a constant is selected indirectly (by clicking on a category) */
    constantUserChanged(constant: ConstantTrait) {
        this.constant = constant;
        if (this.safeguardType === SGT.Point/* && this.variableType === VT.Value*/) {
            let center = this.swatchXScale.invert((constant as PointValueConstant).value);
            this.flexBrush.show();
            this.flexBrush.move(center);
        }
        // else if (this.safeguardType === SGT.Point && this.variableType === VT.Rank) {
        //     let center = this.yScale((constant as PointRankConstant).rank.toString());
        //     this.flexBrush.show();
        //     this.flexBrush.move(center);
        // }
        else if (this.safeguardType === SGT.Range/* && this.variableType === VT.Value*/) {
            let range = (constant as RangeValueConstant).range.map(this.swatchXScale.invert) as [number, number];
            this.flexBrush.show();
            this.flexBrush.move(range);
        }
        // else if (this.safeguardType === SGT.Range && this.variableType === VT.Rank) {
        //     let range = (constant as RangeRankConstant).range.map(d => this.yScale(d.toString())) as [number, number]
        //     this.flexBrush.show();
        //     this.flexBrush.move(range);
        // }

        // ADD CODE FOR SGS
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
        if (![SGT.Point, SGT.Range, SGT.Comparative].includes(this.safeguardType)) return;

        let variable = new CombinedVariable(d.keys.list[0], d.keys.list[1]);

        if (this.variable2 && variable.hash === this.variable2.hash) return;
        this.variable1 = variable;

        if (this.safeguardType === SGT.Range) {
            this.flexBrush.center = this.swatchXScale.invert(d.ci3.center);
        }

        this.updateHighlight();

        this.vis.variableSelected.emit({ variable: variable });
        if (!this.constant) this.setDefaultConstantFromVariable();
    }

    datumSelected2(d: Datum) {
        if (this.safeguardType != SGT.Comparative) return;
        d3.event.preventDefault();

        let variable = new CombinedVariable(d.keys.list[0], d.keys.list[1]);

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
            if (this.safeguardType === SGT.Point/* && this.variableType === VT.Value*/) {
                let constant = new PointValueConstant(this.getDatum(this.variable1).ci3.center);
                this.vis.constantSelected.emit(constant);
                this.constantUserChanged(constant);
            }
            /*else if (this.safeguardType === SGT.Point && this.variableType === VT.Rank) {
                let constant = new PointRankConstant(this.getRank(this.variable1));

                this.vis.constantSelected.emit(constant);
                this.constantUserChanged(constant);
            }*/
            else if (this.safeguardType === SGT.Range/* && this.variableType === VT.Value*/) {
                let range = this.getDatum(this.variable1).ci3;
                let constant = new RangeValueConstant(range.low, range.high);

                this.vis.constantSelected.emit(constant);
                this.constantUserChanged(constant);
            }
            /*else if (this.safeguardType === SGT.Range && this.variableType === VT.Rank) {
                let rank = this.getRank(this.variable1);
                let constant = new RangeRankConstant(rank - 1, rank);

                this.vis.constantSelected.emit(constant);
                this.constantUserChanged(constant);
            }*/
        }
        else if (this.safeguardType === SGT.Distributive) {
            let constant;
            // if(this.fittingType == FT.Gaussian) {
            //     let data = this.data.map(d => {
            //         let range = d.keys.list[0].value();
            //         if(range == null) return [0, 0] as [number, number];
            //         return [(range[0] + range[1]) / 2, d.ci3stdev.center] as [number, number];
            //     });

            //     constant = GaussianConstant.Regression(data);
            // }
            // else if(this.fittingType == FT.PowerLaw) {
            //     constant = PowerLawConstant.Regression(this.data.map((d, i) => [i + 1, d.ci3stdev.center] as [number, number]));
            // }

            this.vis.constantSelected.emit(constant);
            this.constantUserChanged(constant);
        }

        // add codes for SGS
    }


}
