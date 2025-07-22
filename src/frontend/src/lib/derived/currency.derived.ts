import { currentLanguage } from '$lib/derived/i18n.derived';
import type { Currency } from '$lib/enums/currency';
import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
import { currencyStore } from '$lib/stores/currency.store';
import { getCurrencyDecimalDigits, getCurrencySymbol } from '$lib/utils/currency.utils';
import { derived, type Readable } from 'svelte/store';

export const currentCurrency: Readable<Currency> = derived(
	[currencyStore],
	([{ currency }]) => currency
);

export const currentCurrencyExchangeRate: Readable<number | null> = derived(
	[currencyExchangeStore],
	([{ exchangeRateToUsd }]) => exchangeRateToUsd
);

export const currentCurrencySymbol: Readable<string> = derived(
	[currentCurrency, currentLanguage],
	([currency, language]) => getCurrencySymbol({ currency, language }) ?? '$'
);

export const currentCurrencyDecimals: Readable<number> = derived(
	[currentCurrency, currentLanguage],
	([currency, language]) => getCurrencyDecimalDigits({ currency, language })
);
