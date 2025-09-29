import { isEmptyString, isNullish, jsonReplacer, nonNullish, notEmptyString } from '@dfinity/utils';

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
 * Builds a RegExp to match a key-value pair in plain text format like:
 * "Request ID: 123", "status: failed", etc.
 *
 * This pattern is designed for non-JSON strings, such as `Error.message`,
 * and looks for patterns in the form of: key: value (excluding newlines or commas).
 *
 * @param key - The key to match and remove from a plain text string.
 * @returns A case-insensitive global RegExp that matches `key: value` pairs.
 */
const buildTextPattern = (key: string): RegExp => {
	const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp(`"?${escapedKey}"?\\s*:\\s*("?[^"\\n,]+"?)`, 'gi');
};

const cleanTrailingCommasAndLines = (text: string): string =>
	text
		.replace(/,\s*,/g, ',') // ", ,"
		.replace(/,\s*$/g, '') // ", \n"
		.replace(/,\s*\n/g, '\n') // ",\n"
		.replace(/\n\s*\n+/g, '\n') // extra line breaks
		.trim();

/**
 * Normalizes an error by removing specific keys from its structure.
 * Supports objects and JSON-formatted strings. Always returns a string result.
 *
 * - If it's an object, removes the specified keys and returns a JSON string of the result.
 * - If it's a string, removes all matching `"key": "value"` pairs using RegExp.
 * - For all other types (number, boolean, etc.), it returns a string representation.
 *
 * @param params - The parameters for the function.
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

	if (err instanceof Error) {
		return cleanTrailingCommasAndLines(
			keysToRemove.reduce(
				(acc, key) => acc.replace(buildJsonKeyPattern(key), '').replace(buildTextPattern(key), ''),
				err.message
			)
		);
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
		return keysToRemove.reduce((acc, key) => acc.replace(buildJsonKeyPattern(key), ''), err).trim();
	}

	return String(err);
};

export const replaceIcErrorFields = (err: unknown): string | undefined =>
	replaceErrorFields({ err, keysToRemove: ['Request ID'] });

const stripHttpDetails = (text: string): string =>
	text
		// Remove from "HTTP details:" + "{" up to the next closing brace on its own line
		.replace(/HTTP details\s*:\s*\{[\s\S]*?\n}/i, '')
		// Tidy leftover blank lines/commas
		.replace(/\n{2,}/g, '\n')
		.trim();

export const parseIcErrorMessage = (err: unknown): Record<string, string> | undefined => {
	if (isNullish(err)) {
		return;
	}

	if (!(err instanceof Error)) {
		return;
	}

	const { message } = err;

	if (isEmptyString(message)) {
		return;
	}

	try {
		const normalisedMsg = stripHttpDetails(
			message.replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"')
		);

		const messageParts = normalisedMsg
			.split('\n')
			// The first part is just the "Call failed" initial text, we skip it
			.slice(1);

		const kvCandidates = messageParts.filter(
			(part) => !/^\s*at\b/i.test(part) && !/https?:\/\/\S+/i.test(part)
		);

		if (kvCandidates.length === 0) {
			return;
		}

		const cleanRegex = /^\s*['"]?([^'":]+)['"]?\s*:(?!\/\/)\s*['"]?(.+?)['"]?\s*$/;

		const errObj: Record<string, string> = kvCandidates.reduce<Record<string, string>>(
			(acc, part) => {
				const match = part.match(cleanRegex);
				if (nonNullish(match)) {
					const [, rawKey, rawValue] = match;

					return {
						...acc,
						...(notEmptyString(rawKey?.trim()) && nonNullish(rawValue)
							? {
									[rawKey.trim()]: rawValue.trim()
								}
							: {})
					};
				}

				return acc;
			},
			{}
		);

		if (Object.keys(errObj).length === 0) {
			return;
		}

		// Remove the "Request ID" key if it exists, since it is unique per request, so not useful for general error handling
		const {
			['Request ID']: _,
			['Consider gracefully handling failures from this canister or altering the canister to handle exceptions. See documentation']:
				__,
			...rest
		} = errObj;

		return rest;
	} catch (_: unknown) {
		// If parsing fails, we return undefined. We do not need to throw an error here.
		return;
	}
};

export const mapIcErrorMetadata = (err: unknown): Record<string, string> | undefined => {
	if (isNullish(err)) {
		return;
	}

	return parseIcErrorMessage(err) ?? { error: replaceIcErrorFields(err) ?? `${err}` };
};
