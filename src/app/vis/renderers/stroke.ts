import { Point } from './point';

let id = 1;

export class Stroke {
    points: Point[] = [];
    id;

    constructor() {
        this.id = id++;
    }

    addPoint(point:Point) {
        this.points.push(point);
    }
}
