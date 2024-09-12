import type { OptionString } from '$lib/types/string';
import { isNullish } from '@dfinity/utils';

export const isNullishOrEmpty = (value: OptionString): value is undefined | null =>
	isNullish(value) || value === '';

export const invalidAmount = (amount: number | undefined): boolean =>
	isNullish(amount) || amount < 0;
