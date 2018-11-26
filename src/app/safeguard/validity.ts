export type PValue = number; // 0 <= p <= 1
export type Quality = number;  // 0 <= quality <= 1
export type Error = number; // 0 <= error
export type Truthiness = boolean;

export type Validity = PValue | Quality | Error | Truthiness;

export enum ValidityTypes {
    PValue = 'p Value',
    Quality = 'Quality',
    Error = 'Error',
    Truthiness = 'Truthiness'
};
