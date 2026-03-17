import type { Nullish } from '@dfinity/zod-schemas';
import { nonNullish } from '@dfinity/utils';

export function maxBigInt(n1: bigint, n2: bigint): bigint;
export function maxBigInt(n1: bigint, n2: Nullish<bigint>): bigint;
export function maxBigInt(n1: Nullish<bigint>, n2: bigint): bigint;
export function maxBigInt(n1: Nullish<bigint>, n2: Nullish<bigint>): Nullish<bigint>;

// eslint-disable-next-line local-rules/prefer-object-params, prefer-arrow/prefer-arrow-functions -- Visually, it is clearer to have two parameters for maxBigInt and to have the overloads for the types
export function maxBigInt(n1: Nullish<bigint>, n2: Nullish<bigint>): Nullish<bigint> {
	return nonNullish(n1) && nonNullish(n2) ? (n1 > n2 ? n1 : n2) : (n1 ?? n2);
}
