import * as d3 from 'd3';
import { Constants as C } from '../../constants';
import { Datum } from '../../data/datum';
import { selectOrAppend, translate } from '../../d3-utils/d3-utils';
import { AggregateQuery } from '../../data/query';
import * as util from '../../util';
import { EmptyConfidenceInterval } from '../../data/confidence-interval';
import { SafeguardTypes as SGT } from '../../safeguard/safeguard';
import { ScaleLinear } from 'd3';
import { DistributionTrait, LinearConstant } from '../../safeguard/constant';
import { FieldGroupedValue } from '../../data/field-grouped-value';
import { LinearLine } from './linear-line';

const H = C.heatmap;

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

export class HeatmapMinimap {
    brush: d3.BrushBehavior<unknown>;

    blockWidth: number;
    blockHeight: number;
    heatmapAvailWidth: number;
    heatmapAvailHeight: number;

    private svg: any;

    sgt: SGT = SGT.None;

    xScale: d3.ScaleBand<string>;
    yScale: d3.ScaleBand<string>;

    linearLine = new LinearLine();
    zoomXFactor = 1;
    zoomYFactor = 1;

    setDimensions(heatmapAvailWidth: number, heatmapAvailHeight: number) {
        this.heatmapAvailWidth = heatmapAvailWidth;
        this.heatmapAvailHeight = heatmapAvailHeight;
    }

    setZoomFactor(zoomXFactor: number, zoomYFactor: number) {
        this.zoomXFactor = zoomXFactor;
        this.zoomYFactor = zoomYFactor;
    }

    render(minimapWrapper: HTMLDivElement, data: Datum[], query: AggregateQuery,
        xValues: FieldGroupedValue[], yValues: FieldGroupedValue[],
        zScale: any) {
        let d3minimap = d3.select(minimapWrapper);
        let d3minisvg = d3minimap.select('svg');
        this.svg = d3minisvg;

        let xCount = xValues.length;
        let yCount = yValues.length;

        let blockWidth = Math.min(Math.floor(H.minimap.maxWidth / xCount), Math.floor(H.minimap.maxHeight / yCount
            / H.rowHeight * H.columnWidth))
        let blockHeight = blockWidth * H.rowHeight / H.columnWidth;

        this.blockWidth = blockWidth;
        this.blockHeight = blockHeight;

        d3minisvg
            .attr('width', blockWidth * xCount)
            .attr('height', blockHeight * yCount)

        let g = selectOrAppend(d3minisvg, 'g', '.blocks');

        const rects =
            g.selectAll('rect.area')
                .data(data, (d: any) => d.id);

        let enter = rects
            .enter().append('rect').attr('class', 'area')

        const xScale = d3.scaleBand().domain(xValues.map(d => d.hash))
            .range([0, blockWidth * xValues.length]);

        const yScale = d3.scaleBand().domain(yValues.map(d => d.hash))
            .range([0, blockHeight * yValues.length]);

        rects.merge(enter)
            .attr('width', xScale.bandwidth())
            .attr('height', yScale.bandwidth())
            .attr('transform', (d) => {
                return translate(xScale(d.keys.list[0].hash), yScale(d.keys.list[1].hash))
            })
            .attr('fill', d => d.ci3 === EmptyConfidenceInterval ?
                'transparent' :
                zScale(d.ci3.center, d.ci3.high - d.ci3.center)
            );

        this.xScale = xScale;
        this.yScale = yScale;

        rects.exit().remove();

        // install brush

        let brush = d3.brush().handleSize(0);
        this.brush = brush;

        let wrapper = selectOrAppend(d3minisvg, 'g', '.brush-wrapper')
            .call(brush)

        wrapper.select('.selection')
            .style('stroke', 'none')
            // .style('fill', 'rgb(248, 249, 250)');
        wrapper.selectAll('.overlay').remove();

        // install linear line

        this.linearLine.setup(d3minisvg);

        if (this.sgt == SGT.None) this.hideAllOverlays();
    }

    move(left: number, top: number) {
        selectOrAppend(this.svg, 'g', '.brush-wrapper')
            .call(this.brush.move, [[
                left / H.columnWidth * this.blockWidth / this.zoomXFactor,
                top / H.rowHeight * this.blockHeight / this.zoomYFactor,
            ], [
                (left / H.columnWidth + this.heatmapAvailWidth / H.columnWidth) * this.blockWidth / this.zoomXFactor,
                (top / H.rowHeight  + this.heatmapAvailHeight / H.rowHeight)  * this.blockHeight / this.zoomYFactor,
            ]])
    }

    hideAllOverlays() {
        this.linearLine.hide();
    }

    setSafeguardType(sgt: SGT) {
        this.sgt = sgt;

        if (sgt == SGT.None) {
            this.hideAllOverlays();
        }
        else if (sgt == SGT.Linear) {
            this.linearLine.show();
        }
    }

    setLinear(constant: LinearConstant, xKeys: {}, yKeys: {}) {
        this.linearLine.render
            (constant, xKeys, yKeys, this.xScale, this.yScale);
    }
}
