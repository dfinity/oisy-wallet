import { Currency } from '$lib/enums/currency';
import { Languages } from '$lib/enums/languages';

export const SUPPORTED_CURRENCIES = Object.entries(Currency);

// This map defines if a certain language should use its own to format currencies.
// Otherwise, they will all fallback to locale 'en-US'
export const USE_NATIVE_CURRENCY_LOCALE: Partial<Record<Languages, boolean>> = {
	[Languages.CHINESE_SIMPLIFIED]: true
};
