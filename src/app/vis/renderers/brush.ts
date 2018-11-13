import * as d3 from 'd3';
import { VisConstants as VC } from '../vis-constants';
import { translate, selectOrAppend, scale } from '../../d3-utils/d3-utils';

type G = d3.Selection<d3.BaseType, {}, d3.BaseType, {}>;
type Extent = [[number, number], [number, number]];

export enum FlexBrushDirection {
    X,
    Y,
    XY
};

export enum FlexBrushMode {
    Point,
    SymmetricRange
};

export interface FlexBrushOptions {
};

export class FlexBrush<Datum> {
    brushLine: d3.Selection<d3.BaseType, {}, d3.BaseType, {}>;
    brushLine2: d3.Selection<d3.BaseType, {}, d3.BaseType, {}>;
    g: G;
    g1: G; // left
    g2: G; // right
    handleG: G;
    handleG1: G;
    handleG2: G;
    extent: Extent;
    brush: d3.BrushBehavior<Datum>;
    brush1: d3.BrushBehavior<Datum>;
    brush2: d3.BrushBehavior<Datum>;
    handles: string[];
    handlers: { brush?: () => void } = {};
    snap: (number) => number;
    center: number = 600;
    lastSelection: [number, number];

    constructor(public direction: FlexBrushDirection = FlexBrushDirection.X,
        public mode = FlexBrushMode.Point, public options: FlexBrushOptions = {}) {
        this.setDirection(direction);
        this.setMode(mode);
    }

    setup(g: G) {
        this.g = selectOrAppend(g as any, 'g', '.brush-wrapper') as G;
        this.g1 = selectOrAppend(g as any, 'g', '.brush-wrapper1') as G;
        this.g2 = selectOrAppend(g as any, 'g', '.brush-wrapper2') as G;

        this.handleG = selectOrAppend(this.g as any, 'g', '.brush-handle') as G;
        this.handleG1 = selectOrAppend(this.g1 as any, 'g', '.brush-handle') as G;
        this.handleG2 = selectOrAppend(this.g2 as any, 'g', '.brush-handle') as G;

        this.handleG.style('display', 'none')
        this.handleG1.style('display', 'none')
        this.handleG2.style('display', 'none')

        let brushLine = selectOrAppend(g as any, 'line', '.brush-line')
        this.brushLine = brushLine;

        brushLine
            .style('stroke', 'black')
            .attr('pointer-events', 'none')
    }

    setDirection(direction: FlexBrushDirection) {
        this.direction = direction;

        if (this.direction == FlexBrushDirection.X) {
            this.brush = d3.brushX();
            this.brush1 = d3.brushX();
            this.brush2 = d3.brushX();

            this.handles = ['w', 'e'];
        }
        else if (this.direction == FlexBrushDirection.Y) {
            this.brush = d3.brushY();
            this.brush1 = d3.brushY();
            this.brush2 = d3.brushY();

            this.handles = ['n', 's'];
        }
    }

    setMode(mode: FlexBrushMode) {
        this.mode = mode;
        if(!this.g) return
        if (this.mode === FlexBrushMode.Point) {
            this.g.style('display', 'inline');
            this.g1.style('display', 'none');
            this.g2.style('display', 'none');
        }
        else if (this.mode == FlexBrushMode.SymmetricRange) {
            this.g.style('display', 'none');
            this.g1.style('display', 'inline');
            this.g2.style('display', 'inline');
        }
        this.brushLine.style('display', 'none')
    }

    setCenter(center: number) {
        this.center = center;

        let extent = this.extent;

        this.brush1.extent([extent[0], [this.center, extent[1][1]]]);
        this.brush2.extent([[this.center, extent[0][1]], extent[1]]);
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

    render(extent) {
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

                this.moveBrushLine(center, false);
                this.moveHandles(sel[0], sel[1], false);

                if (this.handlers.brush) this.handlers.brush();
            })
            .on('end', () => {
                if (!d3.event.sourceEvent) return;
                if (d3.event.selection == null)
                    handles.attr('display', 'none')

                let center = (d3.event.selection[0] + d3.event.selection[1]) / 2;
                this.move(center, true, true);
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
                this.moveBrush(start, end, false, other);
                this.moveBrushLine(this.center, false);
                this.moveHandles(start, end, false);

                if (this.handlers.brush) this.handlers.brush();
            })
        })

        if (this.mode == FlexBrushMode.Point) {
            this.g.selectAll('rect.selection').style('pointer-events', 'all').style('cursor', 'move');
            this.g.selectAll('.handle').attr('display', 'none')
            this.g.selectAll('rect.overlay').style('display', 'none');
        }
        else if (this.mode == FlexBrushMode.SymmetricRange) {
            this.g1.selectAll('rect.selection').style('pointer-events', 'none').style('cursor', 'default');
            this.g2.selectAll('rect.selection').style('pointer-events', 'none').style('cursor', 'default');

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
            this.moveBrush(center - VC.pointBrushSize, center + VC.pointBrushSize, transition);
            this.moveBrushLine(center, transition);
            this.moveHandles(center - VC.pointBrushSize, center + VC.pointBrushSize, transition);
        }
        else {
            this.moveBrush(range[0], range[1], transition);
            this.moveBrushLine(this.center, transition);
            this.moveHandles(range[0], range[1], transition);
        }
    }

    moveBrush(start: number, end: number, transition = false, other = 0) {
        if (this.mode === FlexBrushMode.Point) {
            let g: any = transition ? this.g.transition() : this.g;

            g.call(this.brush.move as any, [start, end]);

            this.handleG.style('display', 'inline');
            this.handleG1.style('display', 'none');
            this.handleG2.style('display', 'none');
        }
        else if (this.mode === FlexBrushMode.SymmetricRange) {
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

        line
            .style('display', 'inline')
            .attr(this.direction == FlexBrushDirection.X ? 'x1' : 'y1', () => {
                return at;
            })
            .attr(this.direction == FlexBrushDirection.X ? 'x2' : 'y2', () => {
                return at;
            })
            .attr(this.direction == FlexBrushDirection.X ? 'y1' : 'x1', () => {
                return this.direction == FlexBrushDirection.X ? extent[0][1] : extent[0][0];
            })
            .attr(this.direction == FlexBrushDirection.X ? 'y2' : 'x2', () => {
                return this.direction == FlexBrushDirection.X ? extent[1][1] : extent[1][0];
            })
    }

    moveHandles(start: number, end: number, transition = false) {
        if (this.mode == FlexBrushMode.Point) {
            let handles: any = this.handleG.selectAll('.fb-handle');
            handles = transition ? handles.transition() : handles;

            handles
                .attr('transform', (d, i) => {
                    let x = 0, y = 0;
                    if (d == 'w') x = start;
                    else if (d == 'e') x = end;
                    else if (d == 'n') y = start;
                    else if (d == 's') y = end;

                    return translate(x, y);
                })
        }
        else if (this.mode == FlexBrushMode.SymmetricRange) {
            let handles1: any = this.handleG1.selectAll('.fb-handle');
            let handles2: any = this.handleG2.selectAll('.fb-handle');

            handles1 = transition ? handles1.transition() : handles1;
            handles2 = transition ? handles2.transition() : handles2;

            handles1
                .attr('transform', (d, i) => {
                    let x = 0, y = 0;
                    if (d == 'w') x = start;
                    else if (d == 'e') x = end;
                    else if (d == 'n') y = start;
                    else if (d == 's') y = end;

                    return translate(x, y);
                })

            handles2
                .attr('transform', (d, i) => {
                    let x = 0, y = 0;
                    if (d == 'w') x = start;
                    else if (d == 'e') x = end;
                    else if (d == 'n') y = start;
                    else if (d == 's') y = end;

                    return translate(x, y);
                })
        }
    }

    show() {
        this.g.attr('display', 'inline');
    }

    hide() {
        this.g.attr('display', 'none');
    }

    on(event, handler) {
        this.handlers[event] = handler;
    }
}
