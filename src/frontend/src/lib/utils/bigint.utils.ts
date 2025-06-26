import { nonNullish } from '@dfinity/utils';

// eslint-disable-next-line local-rules/prefer-object-params -- Visually, it is clearer to have two parameters for maxBigInt
export const maxBigInt = (n1: bigint | null, n2: bigint | null): bigint | null =>
	nonNullish(n1) && nonNullish(n2) ? (n1 > n2 ? n1 : n2) : (n1 ?? n2);
