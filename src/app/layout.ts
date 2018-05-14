import { Constants } from './constants';

export class Layout {
    calculateRecur(node: any, top: number, depth: number) {
        node.top = top;
        node.left = depth * (Constants.nodeWidth + Constants.columnSpace);
        node.height = Constants.nodeHeight;
        node.width = Constants.nodeWidth;
        node.depth = depth;

        let originalTop = top;
        let lastTop = 0;

        if (node.children && node.children.length > 0) {
            node.children.forEach((child, index) => {
                if (index > 0) {
                    top += Constants.rowSpace + Constants.nodeHeight;
                }
                lastTop = top;
                top = this.calculateRecur(child, top, depth + 1);
            })
        }

        node.childrenHeight = lastTop - originalTop;
        return top;
    }

    calculate(history: any) {
        let layoutHeight: number;
        layoutHeight = this.calculateRecur(history, 0, 0);

        return layoutHeight;
    }
}
