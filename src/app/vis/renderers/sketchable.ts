import * as d3 from 'd3';
import { Point } from './point';
import { Stroke } from './stroke';
import { HandwritingRecognitionService } from '../../handwriting-recognition.service';

export class Sketchable {
    svg: d3.Selection<d3.BaseType, {}, null, undefined>;
    strokesG: d3.Selection<d3.BaseType, {}, null, undefined>;

    strokes:Stroke[] = [];
    line = d3.line<Point>().curve(d3.curveBasis).x(d => d.x).y(d => d.y);
    handlers: {[name:string]: () => void} = {};
    sketching = false;

    constructor(public handwritingRecognitionService: HandwritingRecognitionService) {
    }

    setup(svg) {
        this.svg = svg;
        this.strokesG = svg.append('g');

        let drag = d3.drag();
        let stroke:Stroke;

        drag.on('start', () => {
            stroke = new Stroke();
            let xy = d3.mouse(svg.node());
            stroke.addPoint(new Point(xy[0], xy[1], +new Date()));
            this.add(stroke);
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

        paths.exit().remove();

        let pathsEnter = paths
            .enter()
            .append('path')
            .style('stroke', 'black')
            .style('fill', 'none');

        paths
            .merge(pathsEnter)
            .attr('d', (stroke: Stroke) => this.line(stroke.points));
    }

    recognize() {
        if(this.length === 0) return;
        return this.handwritingRecognitionService.recognize(this.strokes);
    }

    empty() {
        this.strokes = [];
    }

    add(stroke) {
        this.strokes.push(stroke);
    }

    getBoundingBox(): {x: number, y:number, width: number, height: number} {
        let xMin, yMin, xMax, yMax;

        xMin = xMax = this.strokes[0].points[0].x;
        yMin = yMax = this.strokes[0].points[0].y;

        this.strokes.forEach(stroke => {
            stroke.points.forEach(point => {
                if(xMin > point.x) xMin = point.x;
                if(yMin > point.y) yMin = point.y;
                if(xMax < point.x) xMax = point.x;
                if(yMax < point.y) yMax = point.y;
            })
        })

        return {
            x: xMin,
            y: yMin,
            width: xMax - xMin,
            height: yMax - yMin
        };
    }

    get length() {
        return this.strokes.length;
    }
}
