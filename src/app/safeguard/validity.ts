export type PValue = number; // 0 <= p <= 1
export type Quality = number;  // 0 <= quality <= 1
export type Error = number; // 0 <= error
export type Boolean = boolean;

export type Validity = PValue | Quality | Error | Boolean;

export enum ValidityTypes {
    PValue = 'p Value',
    Quality = 'Quality',
    Error = 'Error',
    Boolean = 'Boolean'
};
