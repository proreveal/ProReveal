import { ExplorationNode } from "../../exploration/exploration-node";
import { TooltipComponent } from "../../tooltip/tooltip.component";

/**
 * A renderer does not have states. States must be saved in a node.
 */
export abstract class Renderer {
    abstract setup(node: ExplorationNode, nativeSvg: SVGSVGElement);
    abstract render(node: ExplorationNode, nativeSvg: SVGSVGElement,
        tooltip: TooltipComponent);
}
