import { Query } from "../tiny/query";
import { isNull } from "util";

export class Visual {
    top:number = 0;
    left:number = 0;
    width:number = 0;
    height:number = 0;
    depth:number = 0;
    childrenHeight:number = 0;
}

export class ExplorationNode {
    children:ExplorationNode[] = [];
    visual:Visual = new Visual();

    constructor(public parent:ExplorationNode, public query:Query | null) {

    }

    hasChildren() {
        return this.children.length > 0;
    }

    addChild(child:ExplorationNode) {
        this.children.push(child);
    }

    isRoot() {
        return isNull(this.parent);
    }
}
