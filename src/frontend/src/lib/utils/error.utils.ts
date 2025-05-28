import { isNullish, jsonReplacer } from '@dfinity/utils';

export const errorDetailToString = (err: unknown): string | undefined =>
	typeof err === 'string'
		? err
		: err instanceof Error
			? err.message
			: 'message' in (err as { message: string })
				? (err as { message: string }).message
				: undefined;

/**
 * Builds a regular expression to match a JSON key-value pair like `"key": "value"` (with optional trailing comma).
 * Only supports flat key-value pairs with string values.
 *
 * @param key - The key to build a removal pattern for.
 * @returns A RegExp that matches the `"key": "value"` pattern in a JSON string.
 */
const buildJsonKeyPattern = (key: string): RegExp => {
	const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp(`"\\s*${escapedKey}\\s*"\\s*:\\s*".+?"(,)?`, 'g');
};

/**
 * Normalizes an error by removing specific keys from its structure.
 * Supports objects and JSON-formatted strings. Always returns a string result.
 *
 * - If it's an object, removes the specified keys and returns a JSON string of the result.
 * - If it's a string, removes all matching `"key": "value"` pairs using RegExp.
 * - For all other types (number, boolean, etc.), it returns a string representation.
 *
 * @param params.err - The error to normalize. Unknown type.
 * @param params.keysToRemove - Keys that should be removed from the error object or string.
 * @returns A normalized string representation of the error, or undefined if input is nullish.
 */
export const replaceErrorFields = ({
	err,
	keysToRemove
}: {
	err: unknown;
	keysToRemove: string[];
}): string | undefined => {
	if (isNullish(err)) {
		return;
	}

	if (typeof err === 'object') {
		const source = err as Record<string, unknown>;
		const result: Record<string, unknown> = {};

		for (const key in source) {
			if (!keysToRemove.includes(key)) {
				result[key] = source[key];
			}
		}

		return JSON.stringify(result, jsonReplacer);
	}

	if (typeof err === 'string') {
		return keysToRemove
			.map(buildJsonKeyPattern)
			.reduce((acc, pattern) => acc.replace(pattern, ''), err)
			.trim();
	}

	return String(err);
};
