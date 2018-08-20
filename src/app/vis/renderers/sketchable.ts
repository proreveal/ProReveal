import * as d3 from 'd3';
import { Point } from './point';
import { Stroke } from './stroke';
import { StrokeSet } from './stroke-set';
import { HandwritingRecognitionService } from '../../handwriting-recognition.service';

export class Sketchable {
    svg: d3.Selection<d3.BaseType, {}, null, undefined>;
    strokesG: d3.Selection<d3.BaseType, {}, null, undefined>;

    strokeSet:StrokeSet = new StrokeSet();
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
            this.strokeSet.add(stroke);
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
                .data(this.strokeSet.strokes)

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
        if(this.strokeSet.length === 0) return;
        return this.handwritingRecognitionService.recognize(this.strokeSet.strokes);
    }
}
