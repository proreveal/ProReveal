import { Constants } from '../constants';
import { ExplorationNode } from './exploration-node';

export class ExplorationLayout {
    private layoutRecur(node: ExplorationNode, top: number, depth: number, editable: boolean) {
        node.visual.top = top;
        node.visual.left = depth * (Constants.nodeWidth + Constants.columnSpace);
        node.visual.height = Constants.nodeHeight;
        node.visual.width = Constants.nodeWidth;
        node.visual.depth = depth;

        let bottom = top;

        if (node.hasChildren()) {
            node.children.forEach((child, index) => {
                if (index > 0) {
                    bottom += Constants.rowSpace;
                }
                bottom = this.layoutRecur(child, bottom, depth + 1, editable);
            })

            if (Constants.usePlaceholder && editable) {
                if (node.lastChild().visual.bottom() == bottom) {
                    bottom += Constants.rowSpace + Constants.nodeHeight;
                }
            }
        }
        else {
            bottom = top + node.visual.height;
        }

        node.visual.childrenHeight = bottom - top;

        return bottom;
    }

    layout(root: ExplorationNode, editable: boolean) {
        let layoutHeight: number;
        layoutHeight = this.layoutRecur(root, 0, 0, editable);

        return layoutHeight;
    }
}
