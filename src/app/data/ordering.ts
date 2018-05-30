export enum OrderingDirection {
    Ascending,
    Descending
};

export type OrderingType<T> = (a: T, b: T) => number;

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

export function NumericalOrdering<T>(getter: (d: T) => number, direction = OrderingDirection.Descending): OrderingType<T> {
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

