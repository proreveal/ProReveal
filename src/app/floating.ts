export class Floating {
    left: number;
    top: number;
    visible: boolean = false;

    constructor() {

    }

    show(left: number, top: number, ...rest: any[]) {
        this.visible = true;
        this.left = left;
        this.top = top;
    }

    hide() {
        this.visible = false;
    }

    toggle() {
        this.visible = !this.visible;
    }
}
