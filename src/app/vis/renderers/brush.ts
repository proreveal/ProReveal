import * as d3 from 'd3';

import { Constants as C } from '../../constants';
import { translate, selectOrAppend } from '../../d3-utils/d3-utils';
import * as util from '../../util';

export enum BrushDirection {
    X,
    Y,
    XY
};

export enum BrushMode {
    Point,
    SymmetricRange
};

export interface BrushOptions {
};

export class Brush<Datum> {
    selection: util.G;
    brushLine: util.G;
    referenceLine: util.G;

    root: util.G;
    g: util.G;
    g1: util.G; // left
    g2: util.G; // right
    handleG: util.G;
    handleG1: util.G;
    handleG2: util.G;
    extent: util.Extent;
    brush: d3.BrushBehavior<Datum>;
    brush1: d3.BrushBehavior<Datum>;
    brush2: d3.BrushBehavior<Datum>;
    handles: string[];
    handlers: { brush?: (range: number | [number, number, number]) => void } = {};
    snap: (number) => number;
    center: number = 600;
    range: util.Range;

    constructor(public direction: BrushDirection = BrushDirection.X,
        public mode = BrushMode.Point, public options: BrushOptions = {}) {
        this.setDirection(direction);
        this.setMode(mode);
    }

    setup(g: util.G) {
        this.root = selectOrAppend(g as any, 'g', '.brush-root') as util.G;
        let root = this.root;
        this.g = selectOrAppend(root as any, 'g', '.brush-wrapper') as util.G;
        this.g1 = selectOrAppend(root as any, 'g', '.brush-wrapper1') as util.G;
        this.g2 = selectOrAppend(root as any, 'g', '.brush-wrapper2') as util.G;

        this.handleG = selectOrAppend(this.g as any, 'g', '.brush-handle') as util.G;
        this.handleG1 = selectOrAppend(this.g1 as any, 'g', '.brush-handle') as util.G;
        this.handleG2 = selectOrAppend(this.g2 as any, 'g', '.brush-handle') as util.G;

        this.handleG.style('display', 'none')
        this.handleG1.style('display', 'none')
        this.handleG2.style('display', 'none')

        let referenceLine = selectOrAppend(root as any, 'line', '.reference-line')
        this.referenceLine = referenceLine;

        let selection = selectOrAppend(root as any, 'rect', '.my-selection')
        this.selection = selection;

        let brushLine = selectOrAppend(root as any, 'line', '.brush-line')
        this.brushLine = brushLine;

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

    }

    setDirection(direction: BrushDirection) {
        this.direction = direction;

        if (this.direction == BrushDirection.X) {
            this.brush = d3.brushX();
            this.brush1 = d3.brushX();
            this.brush2 = d3.brushX();

            this.handles = ['w', 'e'];
        }
        else if (this.direction == BrushDirection.Y) {
            this.brush = d3.brushY();
            this.brush1 = d3.brushY();
            this.brush2 = d3.brushY();

            this.handles = ['n', 's'];
        }
    }

    setMode(mode: BrushMode) {
        this.mode = mode;
        if (!this.g) return
        if (this.mode === BrushMode.Point) {
            this.g.style('display', 'inline');
            this.g1.style('display', 'none');
            this.g2.style('display', 'none');
            this.brushLine.style('display', 'inline');
            this.selection.style('display', 'none');
        }
        else if (this.mode == BrushMode.SymmetricRange) {
            this.g.style('display', 'none');
            this.g1.style('display', 'inline');
            this.g2.style('display', 'inline');
            this.brushLine.style('display', 'none');
            this.selection.style('display', 'inline');
        }
    }

    setRefValue(ref: number) {
        let extent = this.extent;

        let [[startX, startY], [endX, endY]] = extent;

        this.referenceLine
            .style('display', 'inline')
            .attr('x1', ref)
            .attr('y1', startY)
            .attr('x2', ref)
            .attr('y2', endY)
    }

    hideReferenceLine() {
        this.referenceLine.style('display', 'none')
    }

    setCenter(center: number) {
        this.center = center;

        let extent = this.extent;

        let x1 = extent[0][0], x2 = extent[1][0];

        let width = Math.min(Math.abs(center - x1), Math.abs(x2 - center));

        this.brush1.extent([[this.center - width, extent[0][1]], [this.center, extent[1][1]]]);
        this.brush2.extent([[this.center, extent[0][1]], [this.center + width, extent[1][1]]]);
        this.g1.call(this.brush1);
        this.g2.call(this.brush2);
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

    render(extent: util.Extent) {
        this.extent = extent;
        this.brush.extent(extent);

        this.brush1.extent(extent);
        this.brush2.extent(extent);

        this.g.call(this.brush);
        this.g1.call(this.brush1);
        this.g2.call(this.brush2);

        this.g.select('rect.selection').style('stroke-width', 0);
        this.g1.select('rect.selection').style('stroke-width', 0);
        this.g2.select('rect.selection').style('stroke-width', 0);

        let translation = this.direction === BrushDirection.X ?
            translate(0, this.extent[0][1] - 40) : translate(this.extent[0][0] - 20, 0);

        this.handleG.attr('transform', translation);
        this.handleG1.attr('transform', translation);
        this.handleG2.attr('transform', translation);

        let handles:any = this.handleG.selectAll('.fb-handle')
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

                this.moveBrushLine(center, false);
                this.moveHandles(sel[0], sel[1], false);

                if (this.handlers.brush) this.handlers.brush(center);
            })
            .on('end', () => {
                if (!d3.event.sourceEvent) return;
                if (d3.event.selection == null)
                    handles.attr('display', 'none')

                let center = (d3.event.selection[0] + d3.event.selection[1]) / 2;
                this.move(center, true, true);
            })

        let arr = [this.brush1, this.brush2];

        let savedCenter = 0;
        arr.forEach((brush, i) => {
            brush
            .on('start', () => {
                savedCenter = this.center;
            })
            .on('brush', () => {
                if (!d3.event.sourceEvent) return;
                if (d3.event.sourceEvent.type == "end") return;

                let x = d3.event.selection[i];

                let delta = Math.abs(savedCenter - x);
                let center = this.center;

                if(center - delta < extent[0][0]) delta = center - extent[0][0];
                if(center + delta > extent[1][0]) delta = Math.min(delta, extent[1][0] - center);

                let range: util.Range = [center - delta, center + delta];

                this.range = range as util.Range;

                this.moveBrushLine(center, false);

                this.moveHandles(range[0], range[1], false);
                this.moveSelection(range[0], range[1]);

                if (this.handlers.brush) this.handlers.brush([center, range[0], range[1]]);
            })
            .on('end', () => {
                if (!d3.event.sourceEvent) return;
                if (d3.event.sourceEvent.type == "end") return;

                this.moveBrush(this.range[0], this.range[1], false);
            })
        })

        if (this.mode == BrushMode.Point) {
            this.g.selectAll('rect.selection')
                .style('pointer-events', 'all')
                .style('cursor', 'move')
                .style('fill', 'transparent')
                //.style('fill', '#FF6F00')
                //.style('fill-opacity', .5)

            this.g.selectAll('.handle').attr('display', 'none')
            this.g.selectAll('rect.overlay').style('display', 'none');
        }
        else if (this.mode == BrushMode.SymmetricRange) {
            this.g1.selectAll('rect.selection').style('pointer-events', 'none').style('cursor', 'default').attr('display', 'none');
            this.g2.selectAll('rect.selection').style('pointer-events', 'none').style('cursor', 'default').attr('display', 'none');

            this.g1.selectAll('.handle.handle--e').style('display', 'none').attr('display', 'none')
            this.g2.selectAll('.handle.handle--w').style('display', 'none').attr('display', 'none')

            this.g1.selectAll('rect.overlay').style('display', 'none');
            this.g2.selectAll('rect.overlay').style('display', 'none');
        }
    }

    move(range: number | [number, number], transition = false, snap = false) {
        if (typeof range === 'number') {
            let center = range;
            if (snap && this.snap) { center = this.snap(center); }
            this.moveBrush(center - C.pointBrushSize, center + C.pointBrushSize, transition);
            this.moveBrushLine(center, transition);
            this.moveHandles(center - C.pointBrushSize, center + C.pointBrushSize, transition);
        }
        else {
            this.range = range as util.Range;
            this.moveSelection(range[0], range[1]);
            this.moveBrush(range[0], range[1], transition);
            this.moveBrushLine(this.center, transition);
            this.moveHandles(range[0], range[1], transition);
        }
    }

    moveBrush(start: number, end: number, transition = false) {
        if (this.mode === BrushMode.Point) {
            let g: any = transition ? this.g.transition() : this.g;

            g.call(this.brush.move as any, [start, end]);

            this.handleG.style('display', 'none');
            this.handleG1.style('display', 'none');
            this.handleG2.style('display', 'none');
        }
        else if (this.mode === BrushMode.SymmetricRange) {
            let g1: any = transition ? this.g1.transition() : this.g1;
            let g2: any = transition ? this.g2.transition() : this.g2;

            g1.call(this.brush1);
            g2.call(this.brush2);

            g1.call(this.brush1.move as any, [start, this.center]);
            g2.call(this.brush2.move as any, [this.center, end]);

            this.handleG.style('display', 'none');
            this.handleG1.style('display', 'inline');
            this.handleG2.style('display', 'inline');
        }
    }

    moveSelection(start, end) {
        if (this.mode === BrushMode.SymmetricRange) {
            this.selection
                .attr('width', end - start)
                .attr('height', this.extent[1][1] - this.extent[0][1])
                .attr('transform', translate(start, this.extent[0][1]));
        }
    }

    moveBrushLine(at: number, transition = false) {
        let line = transition ? this.brushLine.transition() : this.brushLine;
        let extent = this.extent;

        line
            .attr(this.direction == BrushDirection.X ? 'x1' : 'y1', () => {
                return at;
            })
            .attr(this.direction == BrushDirection.X ? 'x2' : 'y2', () => {
                return at;
            })
            .attr(this.direction == BrushDirection.X ? 'y1' : 'x1', () => {
                return this.direction == BrushDirection.X ? extent[0][1] : extent[0][0];
            })
            .attr(this.direction == BrushDirection.X ? 'y2' : 'x2', () => {
                return this.direction == BrushDirection.X ? extent[1][1] : extent[1][0];
            })
    }

    moveHandles(start: number, end: number, transition = false) {
        if (this.mode == BrushMode.Point) {
            let handles: any = this.handleG.selectAll('.fb-handle');
            handles = transition ? handles.transition() : handles;

            handles
                .attr('transform', this.getHandleTranslation(start, end));
        }
        else if (this.mode == BrushMode.SymmetricRange) {
            let handles1: any = this.handleG1.selectAll('.fb-handle');
            let handles2: any = this.handleG2.selectAll('.fb-handle');

            handles1 = transition ? handles1.transition() : handles1;
            handles2 = transition ? handles2.transition() : handles2;

            handles1
                .attr('transform', this.getHandleTranslation(start, end));
            handles2
                .attr('transform', this.getHandleTranslation(start, end));
        }
    }

    show() {
        this.root.attr('display', 'inline');
    }

    hide() {
        this.root.attr('display', 'none');
    }

    getHandleTranslation(start: number, end: number) {
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
