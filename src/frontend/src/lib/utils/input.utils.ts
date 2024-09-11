import type { OptionalNullableString } from '$lib/types/string';
import { isNullish } from '@dfinity/utils';

export const isNullishOrEmpty = (value: OptionalNullableString): value is undefined | null =>
	isNullish(value) || value === '';

export const invalidAmount = (amount: number | undefined): boolean =>
	isNullish(amount) || amount < 0;
