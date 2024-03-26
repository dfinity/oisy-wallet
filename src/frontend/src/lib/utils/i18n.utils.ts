// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
import {
	OISY_ALPHA_WARNING_URL,
	OISY_DESCRIPTION,
	OISY_NAME,
	OISY_ONELINER,
	OISY_REPO_URL,
	OISY_URL
} from '$lib/constants/oisy.constants';

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

export const replaceOisyPlaceholders = (text: string): string =>
	replacePlaceholders(text, {
		$oisy_name: OISY_NAME,
		$oisy_oneliner: OISY_ONELINER,
		$oisy_description: OISY_DESCRIPTION,
		$oisy_url: OISY_URL,
		$oisy_repo_url: OISY_REPO_URL,
		$oisy_alpha_warning_url: OISY_ALPHA_WARNING_URL
	});
