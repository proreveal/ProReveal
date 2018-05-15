import { ServerError } from './exception';

export function assert(value1:any, value2:any) {
    if(value1 !== value2)
        throw new ServerError(`${value1} is not ${value2}`);
}

export function assertIn(value:any, values:any[]) {
    if(!values.includes(value))
        throw new ServerError(`${value} is not in ${values}`);
}
