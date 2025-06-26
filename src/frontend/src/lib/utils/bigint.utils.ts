import type { Option } from '$lib/types/utils';
import { nonNullish } from '@dfinity/utils';

// eslint-disable-next-line local-rules/prefer-object-params -- Visually, it is clearer to have two parameters for maxBigInt
export const maxBigInt = (n1: Option<bigint>, n2: Option<bigint>): Option<bigint> =>
	nonNullish(n1) && nonNullish(n2) ? (n1 > n2 ? n1 : n2) : (n1 ?? n2);
