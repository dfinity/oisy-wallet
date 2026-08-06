import { SUPPORTED_LANGUAGES } from '$env/i18n';
import {
	OISY_DESCRIPTION,
	OISY_NAME,
	OISY_ONELINER,
	OISY_REPO_URL,
	OISY_SHORT,
	OISY_TWITTER_URL,
	OISY_URL
} from '$lib/constants/oisy.constants';
import { Languages } from '$lib/enums/languages';
import { isEmptyString, isNullish, nonNullish } from '@dfinity/utils';

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

/**
 * Joins items the way the given language writes a list — "A, B and C" in English, "A、B、C" in
 * Japanese, and so on. Left to `Intl.ListFormat` rather than hardcoding a separator, because the
 * conjunction, its position and even the comma differ per locale.
 */
export const formatList = ({ items, language }: { items: string[]; language: Languages }): string =>
	new Intl.ListFormat(language, { type: 'conjunction', style: 'long' }).format(items);

export const replaceOisyPlaceholders = (text: string): string =>
	replacePlaceholders(text, {
		$oisy_short: OISY_SHORT,
		$oisy_name: OISY_NAME,
		$oisy_oneliner: OISY_ONELINER,
		$oisy_description: OISY_DESCRIPTION,
		$oisy_url: OISY_URL,
		$oisy_repo_url: OISY_REPO_URL,
		$oisy_twitter_url: OISY_TWITTER_URL
	});

interface MaybeI18n extends I18n {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any;
}

export const resolveText = ({ i18n, path }: { i18n: MaybeI18n; path: string }): string => {
	const text = path.split('.').reduce((prev, current) => prev?.[current], i18n);
	return nonNullish(text) && typeof text !== 'object' ? text : path;
};

export const mergeWithFallback = ({
	refLang,
	targetLang
}: {
	refLang: I18n;
	targetLang: I18n;
}): I18n => {
	const merged = {} as I18n;

	for (const key in refLang) {
		const refValue = refLang[key as keyof I18n];
		const targetValue = targetLang?.[key as keyof I18n];

		if (typeof refValue === 'object' && !Array.isArray(refValue)) {
			merged[key as keyof I18n] = mergeWithFallback({
				refLang: refValue,
				targetLang: targetValue ?? {}
			});
		} else {
			merged[key as keyof I18n] =
				isNullish(targetValue) || isEmptyString(targetValue) ? refValue : targetValue;
		}
	}

	return merged;
};

export const getDefaultLang = (): Languages => {
	const browserLocale = new Intl.Locale(navigator.language);
	const browserLanguage = SUPPORTED_LANGUAGES.find(([_, l]) => l === browserLocale.language);
	if (nonNullish(browserLanguage)) {
		const [_, lang] = browserLanguage;
		return lang;
	}
	return Languages.ENGLISH;
};
