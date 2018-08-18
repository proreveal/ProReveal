import * as d3 from 'd3';
import { Point } from './point';
import { Stroke } from './stroke';

export class Sketchable {
    svg: d3.Selection<d3.BaseType, {}, null, undefined>;
    strokesG: d3.Selection<d3.BaseType, {}, null, undefined>;

    strokes:Stroke[] = [];
    line = d3.line<Point>().curve(d3.curveBasis).x(d => d.x).y(d => d.y);
    handlers: {[name:string]: () => void} = {};
    sketching = false;

    setup(svg) {
        this.svg = svg;
        this.strokesG = svg.append('g');

        let drag = d3.drag();
        let stroke:Stroke;

        drag.on('start', () => {
            stroke = new Stroke();
            this.strokes.push(stroke);
            this.sketching = true;

            if(this.handlers.start)
                this.handlers.start();
        });

        drag.on('drag', () => {
            let xy = d3.mouse(svg.node());
            let point = new Point(xy[0], xy[1], +new Date());

            stroke.addPoint(point);

            this.renderStrokes();
        });

        drag.on('end', () => {
            this.sketching = false;
        });

        svg.call(drag);
        return this;
    }

    on(eventName, handler) {
        this.handlers[eventName] = handler;
        return this;
    }

    renderStrokes() {
        let paths = this.strokesG
                .selectAll('path')
                .data(this.strokes)

        let pathsEnter = paths
            .enter()
            .append('path')
            .style('stroke', 'black')
            .style('fill', 'none');

        paths
            .merge(pathsEnter)
            .attr('d', (stroke: Stroke) => this.line(stroke.points));
    }
}
