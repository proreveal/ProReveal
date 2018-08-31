import { ExplorationNode } from "../../exploration/exploration-node";
import { TooltipComponent } from "../../tooltip/tooltip.component";
import { HandwritingRecognitionService } from "../../handwriting-recognition.service";
import { HandwritingComponent } from "../../handwriting/handwriting.component";
import { SafeguardTypes } from '../../safeguard/safeguard';
import { ConstantTrait } from '../../safeguard/constant';
import { VariableTypes } from '../../safeguard/variable';

/**
 * A renderer does not have states. States must be saved in a node.
 */
export abstract class Renderer {
    constructor()
    {

    }

    abstract setup(node: ExplorationNode, nativeSvg: SVGSVGElement);
    abstract render(node: ExplorationNode, nativeSvg: SVGSVGElement);

    abstract highlight(highlighted: number);
    abstract setSafeguardType(st: SafeguardTypes);
    abstract setVariableType(type: VariableTypes);
    abstract constantUserChanged(constant: ConstantTrait);
}
