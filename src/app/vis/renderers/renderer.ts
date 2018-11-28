import { ExplorationNode } from "../../exploration/exploration-node";
import { SafeguardTypes } from '../../safeguard/safeguard';
import { ConstantTrait, FittingTypes } from '../../safeguard/constant';
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
    abstract setFittingType(type: FittingTypes);

    abstract constantUserChanged(constant: ConstantTrait);
}
