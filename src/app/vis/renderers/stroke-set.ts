import { Stroke } from './stroke';

export class StrokeSet {
    strokes:Stroke[] = [];

    add(stroke) {
        this.strokes.push(stroke);
    }

    getBoundingBox() {
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
