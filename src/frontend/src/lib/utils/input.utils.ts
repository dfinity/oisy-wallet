import type { OptionAmount } from '$lib/types/send';
import type { OptionString } from '$lib/types/string';
import type { Nullish } from '@dfinity/zod-schemas';
import { isEmptyString, isNullish } from '@dfinity/utils';

export const isNullishOrEmpty = (value: OptionString): value is Nullish<''> => isEmptyString(value);

export const invalidAmount = (amount: OptionAmount): boolean =>
	isNullish(amount) || Number(amount) < 0;
