import { Constants } from '../constants';
import { ExplorationNode } from './exploration-node';

export class ExplorationLayout {
    private layoutRecur(node: ExplorationNode, top: number, depth: number) {
        node.visual.top = top;
        node.visual.left = depth * (Constants.nodeWidth + Constants.columnSpace);
        node.visual.height = Constants.nodeHeight;
        node.visual.width = Constants.nodeWidth;
        node.visual.depth = depth;

        let originalTop = top;
        let lastTop = 0;

        if (node.children && node.children.length > 0) {
            node.children.forEach((child, index) => {
                if (index > 0) {
                    top += Constants.rowSpace + Constants.nodeHeight;
                }
                lastTop = top;
                top = this.layoutRecur(child, top, depth + 1);
            })
        }

        node.visual.childrenHeight = lastTop - originalTop;
        return top;
    }

    layout(root:ExplorationNode) {
        let layoutHeight: number;
        layoutHeight = this.layoutRecur(root, 0, 0);

        return layoutHeight;
    }
}
