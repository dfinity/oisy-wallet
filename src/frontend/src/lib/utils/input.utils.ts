import type { OptionAmount } from '$lib/types/send';
import type { OptionString } from '$lib/types/string';
import type { Option } from '$lib/types/utils';
import { isEmptyString, isNullish } from '@dfinity/utils';

export const isNullishOrEmpty = (value: OptionString): value is Option<''> => isEmptyString(value);

export const invalidAmount = (amount: OptionAmount): boolean =>
	isNullish(amount) || Number(amount) < 0;
