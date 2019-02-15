import { SafeguardTypes } from '../../safeguard/safeguard';
import { ConstantTrait, FittingTypes } from '../../safeguard/constant';
import { VariableTypes } from '../../safeguard/variable';
import { AggregateQuery } from '../../data/query';

/**
 * A renderer does not have states. States must be saved in a query.
 */
export abstract class Renderer {
    constructor()
    {

    }

    abstract setup(query: AggregateQuery, nativeSvg: SVGSVGElement);
    abstract render(query: AggregateQuery, nativeSvg: SVGSVGElement);

    abstract highlight(highlighted: number);
    abstract setSafeguardType(st: SafeguardTypes);
    abstract setVariableType(type: VariableTypes);
    abstract setFittingType(type: FittingTypes);

    abstract constantUserChanged(constant: ConstantTrait);
}
