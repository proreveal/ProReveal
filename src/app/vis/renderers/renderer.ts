import { ExplorationNode } from "../../exploration/exploration-node";
import { TooltipComponent } from "../../tooltip/tooltip.component";
import { HandwritingRecognitionService } from "../../handwriting-recognition.service";

/**
 * A renderer does not have states. States must be saved in a node.
 */
export abstract class Renderer {
    constructor(handwritingRecognitionService: HandwritingRecognitionService)
    {

    }

    abstract setup(node: ExplorationNode, nativeSvg: SVGSVGElement,
        tooltip: TooltipComponent);
    abstract render(node: ExplorationNode, nativeSvg: SVGSVGElement,
        tooltip: TooltipComponent);

    abstract recognitionRequested();
}
