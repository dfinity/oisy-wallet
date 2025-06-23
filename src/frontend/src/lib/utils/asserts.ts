import type { Amount } from '$lib/types/send';

/**
 * Asserts that an array has at least one element
 * @param array - The array to check
 * @param message - Optional custom error message
 * @throws Error if array is empty
 */
export const assertArrayNotEmpty: <T>(
	array: T[],
	message?: string
) => asserts array is [T, ...T[]] = <T>(
	array: T[],
	message = 'Array must not be empty'
): asserts array is [T, ...T[]] => {
	if (array.length === 0) {
		throw new Error(message);
	}
};

/**
 * Asserts that a string is not empty or whitespace-only
 * @param value - The string to check
 * @param message - Optional custom error message
 * @throws Error if string is empty or whitespace-only
 */
export const assertStringNotEmpty: (value: string, message?: string) => asserts value is string = (
	value: string,
	message = 'String must not be empty'
): asserts value is string => {
	if (!value || value.trim().length === 0) {
		throw new Error(message);
	}
};

/**
 * Asserts that an amount is valid (positive number)
 * @param amount - The amount to check
 * @param message - Optional custom error message
 * @throws Error if amount is not a positive number
 */
export const assertAmount: (amount: Amount, message?: string) => asserts amount is number = (
	amount: Amount,
	message = 'Amount must be a positive number'
): asserts amount is number => {
	if (typeof amount !== 'number' || amount <= 0) {
		throw new Error(message);
	}
};

/**
 * Asserts that there are sufficient funds for a transaction
 * @param required - The required amount in satoshis
 * @param available - The available balance in satoshis
 * @param message - Optional custom error message
 * @throws Error if insufficient funds
 */
export const assertSufficientBalance: (
	required: bigint,
	available: bigint,
	message?: string
) => void = (
	required: bigint,
	available: bigint,
	message = 'Insufficient balance for the transaction'
): void => {
	if (required > available) {
		throw new Error(message);
	}
};
