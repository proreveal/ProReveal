import * as d3 from 'd3';
import { Constants as C } from '../../constants';
import { Datum } from '../../data/datum';
import { selectOrAppend, translate } from '../../d3-utils/d3-utils';
import { AggregateQuery } from '../../data/query';
import * as util from '../../util';
import { EmptyConfidenceInterval } from '../../data/confidence-interval';

const B = C.bars;

export class BarsMinimap {
    brush: d3.BrushBehavior<unknown>;

    private barsFullWidth: number;
    private barHeight: number;
    private barsAvailWidth: number;
    private barsAvailHeight: number;
    private svg: any;
    miniBarHeight: number;

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

        let miniXScale = d3.scaleLinear().domain([query.domainStart, query.domainEnd])
            .range([0, B.minimap.width])
            .clamp(true)

        let miniYScale = d3.scaleBand().domain(util.srange(data.length))
            .range([0, miniBarHeight * data.length])
            .padding(0);

        rects.merge(enter)
            .attr('width', d => done ? 2 : Math.max(miniXScale(d.ci3.high) - miniXScale(d.ci3.low), B.minimumGradientWidth))
            .attr('transform', (d, i) => {
                if (miniXScale(d.ci3.high) - miniXScale(d.ci3.low) < B.minimumGradientWidth)
                    return translate(miniXScale(d.ci3.center) - B.minimumGradientWidth / 2, miniYScale(i + ''))
                return translate(miniXScale(d.ci3.low), miniYScale(i + ''));
            })
            .attr('height', miniYScale.bandwidth())
            .attr('fill', d => d.ci3 === EmptyConfidenceInterval ?
                'transparent' : 'steelblue'
            );

        rects.exit().remove();

        let brush = d3.brush().handleSize(0);
        this.brush = brush;

        let wrapper = selectOrAppend(d3minisvg, 'g', '.brush-wrapper')
            .call(brush)

        wrapper.select('.selection').style('stroke', 'none');
        wrapper.selectAll('.overlay').remove();
    }

    move(left:number, top: number) {
        const [barsFullWidth, barHeight, barsAvailWidth, barsAvailHeight, miniBarHeight] =
            [this.barsFullWidth, this.barHeight, this.barsAvailWidth, this.barsAvailHeight, this.miniBarHeight];

        selectOrAppend(this.svg, 'g', '.brush-wrapper')
            .call(this.brush.move,
                [[left / barsFullWidth * B.minimap.width,
                    top / barHeight * miniBarHeight],
                [(left + barsAvailWidth) / barsFullWidth * B.minimap.width,
                    (top + barsAvailHeight) / barHeight * miniBarHeight]])
    }
}
