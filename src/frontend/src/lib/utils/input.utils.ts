import type { OptionAmount } from '$lib/types/send';
import type { OptionString } from '$lib/types/string';
import { isEmptyString, isNullish } from '@dfinity/utils';
import type { Nullish } from '@dfinity/zod-schemas';

export const isNullishOrEmpty = (value: OptionString): value is Nullish<''> => isEmptyString(value);

export const invalidAmount = (amount: OptionAmount): boolean =>
	isNullish(amount) || (typeof amount === 'string' && isEmptyString(amount)) || Number(amount) < 0;
