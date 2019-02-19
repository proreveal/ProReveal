import * as d3 from 'd3';
import { Constants as C } from '../../constants';
import { translate, selectOrAppend, scale } from '../../d3-utils/d3-utils';

type G = d3.Selection<d3.BaseType, {}, d3.BaseType, {}>;
type Extent = [[number, number], [number, number]];
const brushSize = C.pointBrushSize;

export enum AngularBrushMode {
    Point,
    SymmetricRange
};

export interface AngularBrushOptions {
};

export class AngularBrush<Datum> {
    brushLine: d3.Selection<d3.BaseType, {}, d3.BaseType, {}>;
    brushLine2: d3.Selection<d3.BaseType, {}, d3.BaseType, {}>;
    referenceLine: d3.Selection<d3.BaseType, {}, d3.BaseType, {}>;
    selectionArcPath: d3.Selection<d3.BaseType, {}, d3.BaseType, {}>;

    root: G;
    g: G;
    g1: G; // left
    g2: G; // right
    handleG: G;
    handleG1: G;
    handleG2: G;
    extent: Extent;
    brush: d3.BrushBehavior<Datum> = d3.brushX();
    brush1: d3.BrushBehavior<Datum> = d3.brushX();
    brush2: d3.BrushBehavior<Datum> = d3.brushX();

    handles: string[] = ['w', 'e'];
    handlers: { brush?: (range: number | [number, number]) => void } = {};
    center: number = 600;
    lastSelection: [number, number];
    selectionArc = d3.arc();

    constructor(public mode = AngularBrushMode.Point, public options: AngularBrushOptions = {}) {
        this.setMode(mode);
    }

    setup(g: G) {
        this.root = selectOrAppend(g as any, 'g', '.brush-root') as G;
        let root = this.root;
        this.g = selectOrAppend(root as any, 'g', '.brush-wrapper') as G;
        this.g1 = selectOrAppend(root as any, 'g', '.brush-wrapper1') as G;
        this.g2 = selectOrAppend(root as any, 'g', '.brush-wrapper2') as G;

        this.handleG = selectOrAppend(this.g as any, 'g', '.brush-handle') as G;
        this.handleG1 = selectOrAppend(this.g1 as any, 'g', '.brush-handle') as G;
        this.handleG2 = selectOrAppend(this.g2 as any, 'g', '.brush-handle') as G;

        this.handleG.style('display', 'none')
        this.handleG1.style('display', 'none')
        this.handleG2.style('display', 'none')

        let referenceLine = selectOrAppend(root as any, 'line', '.reference-line')
        this.referenceLine = referenceLine;

        let brushLine = selectOrAppend(root as any, 'line', '.brush-line')
        this.brushLine = brushLine;

        let selectionArcPath = selectOrAppend(root as any, 'path', '.selection-arc')
        this.selectionArcPath = selectionArcPath;

        brushLine
            .style('stroke', 'black')
            .attr('pointer-events', 'none')

        referenceLine
            .style('stroke', 'red')
            .style('stroke-width', 3)
            .style('stroke-linecap', 'round')
            .attr('pointer-events', 'none')

        selectionArcPath
            .style('fill', 'black')
            .style('opacity', .2)
            .attr('pointer-events', 'none')
    }

    setMode(mode: AngularBrushMode) {
        this.mode = mode;
        if (!this.g) return
        if (this.mode === AngularBrushMode.Point) {
            this.g.style('display', 'inline');
            this.g1.style('display', 'none');
            this.g2.style('display', 'none');
        }
        else if (this.mode == AngularBrushMode.SymmetricRange) {
            this.g.style('display', 'none');
            this.g1.style('display', 'inline');
            this.g2.style('display', 'inline');
        }
        this.brushLine.style('display', 'none')
    }

    setReferenceValue(ref: number) {
        let extent = this.extent;

        let [[startX, startY], [endX, endY]] = extent;
        let width = endX - startX;
        let height = endY - startY;

        let norm = (ref - startX) / (endX - startX);
        let angle = (norm - 0.5) * Math.PI / 3;

        this.referenceLine
            .style('display', 'inline')
            .attr('x1', norm * (endX - startX) + startX)
            .attr('y1', startY + height * (1 - Math.cos(angle)))
            .attr('x2', startX + width / 2)
            .attr('y2', endY)
    }

    setCenter(center: number) {
        this.center = center;

        let extent = this.extent;

        let x1 = extent[0][0], x2 = extent[1][0];

        let width = Math.min(center - x1, x2 - center);
        this.brush1.extent([[this.center - width, extent[0][1]], [this.center, extent[1][1]]]);
        this.brush2.extent([[this.center, extent[0][1]], [this.center + width, extent[1][1]]]);
    }

    getHandle(dir: string, size = 10) {
        if (dir == 'w') {
            return "M-0.5,33.33A6,6 0 0 0 -6.5,39.33V60.66A6,6 0 0 0 -0.5,66.66ZM-2.5,41.33V58.66M-4.5,41.33V58.66";
        }
        else if (dir == 'e') {
            return "M0.5,33.33A6,6 0 0 1 6.5,39.33V60.66A6,6 0 0 1 0.5,66.66ZM2.5,41.33V58.66M4.5,41.33V58.66";
        }
        else if (dir == 'n') {
            return "M33.33,-0.5A6,6 0 0 1 39.33,-6.5H60.66A6,6 0 0 1 66.66,-0.5ZM41.33,-2.5H58.66M41.33,-4.5H58.66";
        }
        else if (dir == 's') {
            return "M33.33,0.5A6,6 0 0 0 39.33,6.5H60.66A6,6 0 0 0 66.66,0.5ZM41.33,2.5H58.66M41.33,4.5H58.66";
        }
    }
    /*
    <path d="M-0.5,33.33A6,6 0 0 0 -6.5,39.33V60.66A6,6 0 0 0 -0.5,66.66ZM-2.5,41.33V58.66M-4.5,41.33V58.66"></path>
    <path d="M0.5,33.33A6,6 0 0 1 6.5,39.33V60.66A6,6 0 0 1 0.5,66.66ZM2.5,41.33V58.66M4.5,41.33V58.66"></path>
    */

    render(extent = [[1, 2], [3, 4]] as [[number, number], [number, number]]) {
        this.extent = extent;
        this.brush.extent([[extent[0][0] - brushSize, extent[0][1] - 2 * brushSize],
            [extent[1][0] + brushSize, (extent[1][1] - extent[0][1]) * (1 - Math.cos(Math.PI / 3))]]);
        this.brush1.extent(extent);
        this.brush2.extent(extent);

        this.g.call(this.brush);
        this.g1.call(this.brush1);
        this.g2.call(this.brush2);

        this.g.select('rect.selection').style('stroke-width', 0);
        this.g1.select('rect.selection').style('stroke-width', 0);
        this.g2.select('rect.selection').style('stroke-width', 0);

        let translation = translate(0, this.extent[0][1] - 40);

        this.handleG.attr('transform', translation);
        this.handleG1.attr('transform', translation);
        this.handleG2.attr('transform', translation);

        let handles = this.handleG.selectAll('.fb-handle')
            .data(this.handles);

        handles.exit().remove();

        handles = handles.enter().append('path')
            .style('fill', '#eee')
            .style('stroke', '#666')
            .attr('class', 'fb-handle')
            .merge(handles)
            .attr('d', this.getHandle)

        this.handleG1
            .selectAll('.fb-handle')
            .data(['w']).enter().append('path')
            .style('fill', '#eee')
            .style('stroke', '#666')
            .attr('class', 'fb-handle')
            .attr('d', this.getHandle)

        this.handleG2
            .selectAll('.fb-handle')
            .data(['e']).enter().append('path')
            .style('fill', '#eee')
            .style('stroke', '#666')
            .attr('class', 'fb-handle')
            .attr('d', this.getHandle)

        this.brush
            .on('brush', () => {
                if (!d3.event.sourceEvent) return;
                let sel = d3.event.selection;
                let center = (sel[0] + sel[1]) / 2;
                let [[startX, startY], [endX, endY]] = extent;
                let norm = (center - (startX + brushSize)) / (endX - startX - 2 * brushSize)

                this.moveBrushLine(center, false);
                this.moveHandles(sel[0], sel[1], false);

                if (this.handlers.brush) this.handlers.brush(center);
            })
            .on('end', () => {
                if (!d3.event.sourceEvent) return;
                if (d3.event.selection == null)
                    handles.attr('display', 'none')

                let center = (d3.event.selection[0] + d3.event.selection[1]) / 2;
                this.move(center, true);
            })

        let arr = [this.brush1, this.brush2];
        arr.forEach((brush, i) => {
            brush.on('brush', () => {
                if (!d3.event.sourceEvent) return;
                let sel = d3.event.selection;

                if (!sel) return;
                if (this.lastSelection &&
                    (this.lastSelection[0] == sel[0] && i == 0
                        || this.lastSelection[1] == sel[1] && i == 1)
                ) return;

                let other = this.brush1 == brush ? 2 : 1;

                let center = this.center;
                let start = i == 0 ? sel[0] : center - (sel[1] - center);
                let end = i == 0 ? center + (center - sel[0]) : sel[1];

                this.lastSelection = [start, end];
                start = Math.max(start, this.extent[0][0]);
                end = Math.min(end, this.extent[1][0]);

                this.moveBrush(start, end, false, other);

                this.moveBrushLine(this.center, false);
                this.moveHandles(start, end, false);

                if (this.handlers.brush) this.handlers.brush([start, end]);
            })
        })

        if (this.mode == AngularBrushMode.Point) {
            this.g.selectAll('rect.selection').style('pointer-events', 'all').style('cursor', 'move')
                .style('fill', 'transparent');
            this.g.selectAll('.handle').attr('display', 'none')
            this.g.selectAll('rect.overlay').style('display', 'none');
        }
        else if (this.mode == AngularBrushMode.SymmetricRange) {
            this.g1.selectAll('rect.selection').style('pointer-events', 'none').style('cursor', 'default');
            this.g2.selectAll('rect.selection').style('pointer-events', 'none').style('cursor', 'default');

            this.g1.selectAll('.handle.handle--e').style('display', 'none').attr('display', 'none')
            this.g2.selectAll('.handle.handle--w').style('display', 'none').attr('display', 'none')

            this.g1.selectAll('rect.overlay').style('display', 'none');
            this.g2.selectAll('rect.overlay').style('display', 'none');
        }
    }

    move(range: number | [number, number], transition = false) {
        if (typeof range === 'number') {
            let center = range;
            this.moveBrush(center - brushSize, center + brushSize, transition);
            this.moveBrushLine(center, transition);
            this.moveHandles(center - brushSize, center + brushSize, transition);
        }
        else {
            this.moveBrush(range[0], range[1], transition);
            this.moveBrushLine(this.center, transition);
            this.moveHandles(range[0], range[1], transition);
        }
    }

    moveBrush(start: number, end: number, transition = false, other = 0) {
        if (this.mode === AngularBrushMode.Point) {
            let g: any = transition ? this.g.transition() : this.g;

            g.call(this.brush.move as any, [start, end]);

            this.handleG.style('display', 'inline');
            this.handleG1.style('display', 'none');
            this.handleG2.style('display', 'none');
        }
        else if (this.mode === AngularBrushMode.SymmetricRange) {
            let g1: any = transition ? this.g1.transition() : this.g1;
            let g2: any = transition ? this.g2.transition() : this.g2;


            if (!other || other == 1) g1.call(this.brush1).call(this.brush1.move as any, [start, this.center]);
            if (!other || other == 2) g2.call(this.brush2).call(this.brush2.move as any, [this.center, end]);

            this.handleG.style('display', 'none');
            this.handleG1.style('display', 'inline');
            this.handleG2.style('display', 'inline');
        }
    }

    moveBrushLine(at: number, transition = false) {
        let line = transition ? this.brushLine.transition() : this.brushLine;
        let extent = this.extent;

        let [[startX, startY], [endX, endY]] = extent;
        let width = endX - startX;
        let height = endY - startY;

        let norm = (at - startX) / (endX - startX);
        let angle = (norm - 0.5) * Math.PI / 3;

        line
            .style('display', 'inline')
            .attr('x1', norm * (endX - startX) + startX)
            .attr('y1', startY + height * (1 - Math.cos(angle)))
            .attr('x2', startX + width / 2)
            .attr('y2', endY)
    }

    moveHandles(start: number, end: number, transition = false) {
        if (this.mode == AngularBrushMode.Point) {
            let handles: any = this.handleG.selectAll('.fb-handle');
            handles = transition ? handles.transition() : handles;

            const [[startX, startY], [endX, endY]] = this.extent;
            let at = (start + end) / 2;
            let norm = (at - startX) / (endX - startX);
            let angle = (norm - 0.5) * Math.PI / 3;

            let x = norm * (endX - startX) + startX;
            let width = endX - startX;
            let height = endY - startY;
            let y = startY + height * (1 - Math.cos(angle));

            let adj = startY + 10;

            d3.select(handles.nodes()[0])
                .attr('transform', `translate(${
                            x + adj * Math.sin(angle) / 2
                            - brushSize * Math.cos(angle) + brushSize * (norm * 2 - 1) * 1.2
                            }, ${
                            y - adj * Math.cos(angle)
                            - brushSize * Math.sin(angle)
                            })rotate(${angle * 180 / Math.PI})`
                );

            d3.select(handles.nodes()[1])
                .attr('transform', `translate(${
                            x + adj * Math.sin(angle) / 2
                            + brushSize * Math.cos(angle) + brushSize * (norm * 2 - 1) * 1.2
                            }, ${
                            y - adj * Math.cos(angle)
                            + brushSize * Math.sin(angle)
                            })rotate(${angle * 180 / Math.PI})`
                );

            this.selectionArc
                .innerRadius(0)
                .outerRadius(height)
                .startAngle(angle - brushSize / height)
                .endAngle(angle + brushSize / height)

            this.selectionArcPath
                .attr('d', this.selectionArc)
                .attr('transform', translate(startX + width / 2, endY));

        }
        else if (this.mode == AngularBrushMode.SymmetricRange) {
            let handles1: any = this.handleG1.selectAll('.fb-handle');
            let handles2: any = this.handleG2.selectAll('.fb-handle');

            handles1 = transition ? handles1.transition() : handles1;
            handles2 = transition ? handles2.transition() : handles2;

            handles1
                .attr('transform', this.getHandleTransform(start, end));
            handles2
                .attr('transform', this.getHandleTransform(start, end));
        }
    }

    show() {
        this.root.attr('display', 'inline');
    }

    hide() {
        this.root.attr('display', 'none');
    }

    getHandleTransform(start: number, end: number) {
        return (d, i) => {
            let x = 0, y = 0;
            if (d == 'w') x = start;
            else if (d == 'e') x = end;
            else if (d == 'n') y = start;
            else if (d == 's') y = end;

            return translate(x, y);
        }
    }

    on(event, handler) {
        this.handlers[event] = handler;
    }
}
