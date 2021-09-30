import { Layout } from './layout';

export interface Parameter extends Layout {
    paramName: string;
    type: string;
    paramSize?: number;
    declarable: boolean;
}
