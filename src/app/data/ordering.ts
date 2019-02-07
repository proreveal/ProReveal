import { NullGroupId } from "./grouper";

export enum OrderingDirection {
    Ascending,
    Descending
};

export type OrderingType<T> = (a: T, b: T) => number;

/**
 * order an array of strings
 * @param getter
 * @param direction
 */
export function AlphabeticalOrdering<T>(getter: (d: T) => string, direction = OrderingDirection.Descending): OrderingType<T> {
    if (direction === OrderingDirection.Ascending) {
        return (a: T, b: T) => {
            let ga = getter(a);
            let gb = getter(b);
            if (ga > gb) return 1;
            else if (ga < gb) return -1;
            return 0;
        };
    }

    return (a: T, b: T) => {
        let ga = getter(a);
        let gb = getter(b);
        if (ga > gb) return -1;
        else if (ga < gb) return 1;
        return 0;
    }
}

/**
 * order an array of numbers
 * @param getter
 * @param direction
 */
export function NumericalOrdering<T extends {keys: any}>
    (getter: (d: T) => number, direction = OrderingDirection.Descending): OrderingType<T> {
    if (direction === OrderingDirection.Ascending) {
        return (a: T, b: T) => {
            let ga = getter(a);
            let gb = getter(b);

            if(a.keys.hasNullValue()) return 1;
            if(b.keys.hasNullValue()) return -1;

            if (ga > gb) return 1;
            else if (ga < gb) return -1;
            return 0;
        };
    }

    return (a: T, b: T) => {
        let ga = getter(a);
        let gb = getter(b);

        if(a.keys.hasNullValue()) return 1;
        if(b.keys.hasNullValue()) return -1;

        if (ga > gb) return -1;
        else if (ga < gb) return 1;
        return 0;
    }
}

