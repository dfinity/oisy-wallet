import type { Amount } from '$lib/types/send';

/**
 * Asserts that an array has at least one element
 * @param params - Object containing array and optional message
 * @param params.array - The array to check
 * @param params.message - Optional custom error message
 * @throws Error if array is empty
 */
export const assertArrayNotEmpty = <T>(params: { array: T[]; message?: string }): void => {
	const { array, message = 'Array must not be empty' } = params;
	if (array.length === 0) {
		throw new Error(message);
	}
};

/**
 * Asserts that a string is not empty or whitespace-only
 * @param params - Object containing value and optional message
 * @param params.value - The string to check
 * @param params.message - Optional custom error message
 * @throws Error if string is empty or whitespace-only
 */
export const assertStringNotEmpty = (params: { value: string; message?: string }): void => {
	const { value, message = 'String must not be empty' } = params;
	if (!value || value.trim().length === 0) {
		throw new Error(message);
	}
};

/**
 * Asserts that an amount is valid (positive number or parseable positive string)
 * @param params - Object containing amount and optional message
 * @param params.amount - The amount to check (string or number)
 * @param params.message - Optional custom error message
 * @throws Error if amount is not a positive number or parseable positive string
 */
export const assertAmount = (params: { amount: Amount; message?: string }): void => {
	const { amount, message = 'Amount must be a positive number' } = params;

	// Handle number type
	if (typeof amount === 'number') {
		if (amount <= 0 || !isFinite(amount)) {
			throw new Error(message);
		}
		return;
	}

	// Handle string type
	if (typeof amount === 'string') {
		const trimmedAmount = amount.trim();
		if (trimmedAmount === '') {
			throw new Error(message);
		}

		const numericAmount = parseFloat(trimmedAmount);
		if (isNaN(numericAmount) || numericAmount <= 0 || !isFinite(numericAmount)) {
			throw new Error(message);
		}
		return;
	}

	// Neither string nor number
	throw new Error(message);
};

/**
 * Asserts that there are adequate funds for a transaction
 * @param params - Object containing required amount, available balance, and optional message
 * @param params.required - The required amount in satoshis
 * @param params.available - The available balance in satoshis
 * @param params.message - Optional custom error message
 * @throws Error if inadequate funds
 */
export const assertAdequateBalance = (params: {
	required: bigint;
	available: bigint;
	message?: string;
}): void => {
	const { required, available, message = 'Inadequate balance for the transaction' } = params;
	if (required > available) {
		throw new Error(message);
	}
};
