// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
const escapeRegExp = (regExpText: string): string =>
	regExpText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string

export type I18nSubstitutions = { [from: string]: string };

/**
 * @example
 * ("Why $1?", {$1: "World", Why: "Hello", "?": "!"}) => "Hello World!"
 */
export const replacePlaceholders = (text: string, substitutions: I18nSubstitutions): string => {
	let result = text;
	for (const [key, value] of Object.entries(substitutions)) {
		result = result.replace(new RegExp(escapeRegExp(key), 'g'), value);
	}

	return result;
};
