import { ExplorationNode } from "../../exploration/exploration-node";
import { TooltipComponent } from "../../tooltip/tooltip.component";
import { HandwritingRecognitionService } from "../../handwriting-recognition.service";
import { HandwritingComponent } from "../../handwriting/handwriting.component";

/**
 * A renderer does not have states. States must be saved in a node.
 */
export abstract class Renderer {
    constructor(handwritingRecognitionService: HandwritingRecognitionService)
    {

    }

    abstract setup(node: ExplorationNode, nativeSvg: SVGSVGElement);
    abstract render(node: ExplorationNode, nativeSvg: SVGSVGElement);

    abstract recognitionRequested(callback?: (result:any) => any);
    abstract clearRequested();
}
