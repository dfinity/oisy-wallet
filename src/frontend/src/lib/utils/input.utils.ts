import { isNullish } from '@dfinity/utils';

export const isNullishOrEmpty = (value: string): boolean => isNullish(value) || value === '';

export const invalidAmount = (amount: number | undefined): boolean =>
	isNullish(amount) || amount < 0;
