import {
	OISY_ALPHA_WARNING_URL,
	OISY_DESCRIPTION,
	OISY_NAME,
	OISY_ONELINER,
	OISY_REPO_URL,
	OISY_SHORT,
	OISY_TWITTER_URL,
	OISY_URL
} from '$lib/constants/oisy.constants';
import { isNullish, nonNullish } from '@dfinity/utils';

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
const escapeRegExp = (regExpText: string): string =>
	regExpText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string

export interface I18nSubstitutions {
	[from: string]: string;
}

/**
 * @example
 * ("Why $1?", {$1: "World", Why: "Hello", "?": "!"}) => "Hello World!"
 */
// eslint-disable-next-line local-rules/prefer-object-params -- This function is used a lot throughout the codebase, and it's easier/clearer to use it with separate arguments.
export const replacePlaceholders = (text: string, substitutions: I18nSubstitutions): string => {
	let result = text;
	for (const [key, value] of Object.entries(substitutions)) {
		result = result.replace(new RegExp(escapeRegExp(key), 'g'), value);
	}

	return result;
};

export const replaceOisyPlaceholders = (text: string): string =>
	replacePlaceholders(text, {
		$oisy_short: OISY_SHORT,
		$oisy_name: OISY_NAME,
		$oisy_oneliner: OISY_ONELINER,
		$oisy_description: OISY_DESCRIPTION,
		$oisy_url: OISY_URL,
		$oisy_repo_url: OISY_REPO_URL,
		$oisy_alpha_warning_url: OISY_ALPHA_WARNING_URL,
		$oisy_twitter_url: OISY_TWITTER_URL
	});

interface MaybeI18n extends I18n {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any;
}

export const resolveText = ({
	i18n,
	path
}: {
	i18n: MaybeI18n;
	path: string | undefined;
}): string | undefined => {
	// For simplicity reason, we defer this checks within that function that way we can keep our components concise and use optional chaining within those.
	if (isNullish(path)) {
		return undefined;
	}

	const text = path.split('.').reduce((prev, current) => prev?.[current], i18n);
	return nonNullish(text) && typeof text !== 'object' ? text : path;
};
