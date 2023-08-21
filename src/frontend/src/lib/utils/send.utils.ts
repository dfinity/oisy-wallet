import { isNullish } from '@dfinity/utils';

export const invalidDestination = (destination: string): boolean =>
	isNullish(destination) || destination === '';

export const invalidAmount = (amount: number | undefined): boolean =>
    isNullish(amount) || amount <= 0;
