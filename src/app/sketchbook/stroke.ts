import { Point } from './point';

export class Stroke {
    points: Point[] = [];

    addPoint(point:Point) {
        this.points.push(point);
    }
}
