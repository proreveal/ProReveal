import * as d3 from 'd3';
import { Constants as C } from '../../constants';
import { Datum } from '../../data/datum';
import { selectOrAppend, translate } from '../../d3-utils/d3-utils';
import { AggregateQuery } from '../../data/query';
import * as util from '../../util';
import { EmptyConfidenceInterval } from '../../data/confidence-interval';
import { SafeguardTypes as SGT } from '../../safeguard/safeguard';
import { ScaleLinear } from 'd3';
import { DistributionLine } from './distribution-line';
import { DistributionTrait } from '../../safeguard/constant';

const B = C.bars;

function hide(...args: any[]) {
    for (let i = 0; i < args.length; i++) {
        args[i].style('display', 'none');
    }
}

function show(...args: any[]) {
    for (let i = 0; i < args.length; i++) {
        args[i].style('display', 'inline');
    }
}

export class BarsMinimap {
    brush: d3.BrushBehavior<unknown>;

    private barsFullWidth: number;
    private barHeight: number;
    private barsAvailWidth: number;
    private barsAvailHeight: number;
    private svg: any;
    miniBarHeight: number;

    selection: util.G;
    brushLine: util.G;
    referenceLine: util.G;
    sgt: SGT = SGT.None;

    xScale: ScaleLinear<number, number>;
    yScale: d3.ScaleBand<string>;

    distributionLine = new DistributionLine();

    setDimensions(barsFullWidth: number,
        barHeight: number,
        barsAvailWidth: number,
        barsAvailHeight: number) {

        this.barsFullWidth = barsFullWidth;
        this.barHeight = barHeight;
        this.barsAvailWidth = barsAvailWidth;
        this.barsAvailHeight = barsAvailHeight;
    }

    render(minimapWrapper: HTMLDivElement, data: Datum[], query: AggregateQuery) {
        let d3minimap = d3.select(minimapWrapper);
        let d3minisvg = d3minimap.select('svg');
        this.svg = d3minisvg;

        let miniBarHeight = Math.min(Math.floor(B.minimap.maxHeight / data.length), 3);
        this.miniBarHeight = miniBarHeight;

        let done = query.visibleProgress.done();

        d3minisvg
            .attr('width', B.minimap.width)
            .attr('height', miniBarHeight * data.length)

        let g = selectOrAppend(d3minisvg, 'g', '.mini-bars');

        const rects =
            g.selectAll('rect.bar')
                .data(data, (d: any) => d.id);

        let enter = rects
            .enter().append('rect').attr('class', 'bar')

        let xScale = d3.scaleLinear().domain([query.domainStart, query.domainEnd])
            .range([0, B.minimap.width])
            .clamp(true)

        let yScale = d3.scaleBand().domain(util.srange(data.length))
            .range([0, miniBarHeight * data.length])
            .padding(0);

        this.xScale = xScale;
        this.yScale = yScale;

        rects.merge(enter)
            .attr('width', d => done ? 2 : Math.max(xScale(d.ci3.high) - xScale(d.ci3.low), B.minimumGradientWidth))
            .attr('transform', (d, i) => {
                if (xScale(d.ci3.high) - xScale(d.ci3.low) < B.minimumGradientWidth)
                    return translate(xScale(d.ci3.center) - B.minimumGradientWidth / 2, yScale(i + ''))
                return translate(xScale(d.ci3.low), yScale(i + ''));
            })
            .attr('height', yScale.bandwidth())
            .attr('fill', d => d.ci3 === EmptyConfidenceInterval ?
                'transparent' : 'steelblue'
            );

        rects.exit().remove();

        // install brush

        let brush = d3.brush().handleSize(0);
        this.brush = brush;

        let wrapper = selectOrAppend(d3minisvg, 'g', '.brush-wrapper')
            .call(brush)

        wrapper.select('.selection').style('stroke', 'none');
        wrapper.selectAll('.overlay').remove();

        // install distribution line

        this.distributionLine.setup(d3minisvg);

        // install overlays

        let referenceLine = selectOrAppend(d3minisvg, 'line', '.reference-line')
        this.referenceLine = referenceLine;

        let selection = selectOrAppend(d3minisvg, 'rect', '.my-selection')
        this.selection = selection;

        let brushLine = selectOrAppend(d3minisvg, 'line', '.brush-line')
        this.brushLine = brushLine;


        // default styles for overlays
        brushLine
            .style('stroke', '#DD2C00')
            .style('stroke-width', 3)
            .attr('pointer-events', 'none')

        selection
            .style('fill', '#777')
            .style('opacity', .3)
            .style('pointer-events', 'none')

        referenceLine
            .style('stroke', 'black')
            .style('stroke-width', 3)
            .style('stroke-linecap', 'round')
            .attr('pointer-events', 'none')

        if(this.sgt == SGT.None) this.hideAllOverlays();
    }

    move(left: number, top: number) {
        const [barsFullWidth, barHeight, barsAvailWidth, barsAvailHeight, miniBarHeight] =
            [this.barsFullWidth, this.barHeight, this.barsAvailWidth, this.barsAvailHeight, this.miniBarHeight];

        selectOrAppend(this.svg, 'g', '.brush-wrapper')
            .call(this.brush.move,
                [[left / barsFullWidth * B.minimap.width,
                top / barHeight * miniBarHeight],
                [(left + barsAvailWidth) / barsFullWidth * B.minimap.width,
                (top + barsAvailHeight) / barHeight * miniBarHeight]])
    }

    hideAllOverlays() {
        hide(this.brushLine, this.selection, this.referenceLine);
    }

    setSafeguardType(sgt: SGT) {
        this.sgt = sgt;

        if(sgt == SGT.None) {
            this.hideAllOverlays();
            this.distributionLine.hide();
        }
        else if(sgt == SGT.Value) {
            show(this.brushLine, this.referenceLine);
        }
        else if(sgt == SGT.Rank) {
            show(this.brushLine);
        }
        else if(sgt == SGT.Range) {
            show(this.selection);
        }
        else if(sgt == SGT.PowerLaw || sgt == SGT.Normal) {
            this.distributionLine.show();
        }
    }

    setRefValue(value: number, xScale: ScaleLinear<number, number>) {
        let range = xScale.range() as util.Range;
        let norm = (xScale(value) - range[0]) / (range[1] - range[0]);

        let x = norm * B.minimap.width;

        this.referenceLine
            .attr('x1', x)
            .attr('y1', this.yScale.range()[0])
            .attr('x2', x)
            .attr('y2', this.yScale.range()[1])
    }

    setValue(value: number, xScale: ScaleLinear<number, number>) {
        let range = xScale.range() as util.Range;
        let norm = (xScale(value) - range[0]) / (range[1] - range[0]);

        let x = norm * B.minimap.width;

        this.brushLine
            .attr('x1', x)
            .attr('y1', this.yScale.range()[0])
            .attr('x2', x)
            .attr('y2', this.yScale.range()[1])
    }

    setRank(rank: string) {
        let y = this.yScale(rank);

        this.brushLine
            .attr('x1', this.xScale.range()[0])
            .attr('y1', y)
            .attr('x2', this.xScale.range()[1])
            .attr('y2', y)
    }

    setRange(range: util.Range, xScale: ScaleLinear<number, number>) {
        let xRange = xScale.range() as util.Range;
        let norm1 = (xScale(range[0]) - xRange[0]) / (xRange[1] - xRange[0]);
        let norm2 = (xScale(range[1]) - xRange[0]) / (xRange[1] - xRange[0]);

        let x1 = norm1 * B.minimap.width;
        let x2 = norm2 * B.minimap.width;

        this.selection
            .attr('x', x1)
            .attr('width', x2 - x1)
            .attr('y', this.yScale.range()[0])
            .attr('height', this.yScale.range()[1] - this.yScale.range()[0])
    }

    setDistribution(constant: DistributionTrait, data: Datum[],
        yGetter: (a0: Datum, a1: number) => [number, number]) {

        this.distributionLine.render(constant, data, yGetter, this.xScale, this.yScale);
    }
}
