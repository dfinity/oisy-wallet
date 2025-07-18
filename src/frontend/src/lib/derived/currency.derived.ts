import type { Currency } from '$lib/enums/currency';
import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
import { currencyStore } from '$lib/stores/currency.store';
import { derived, type Readable } from 'svelte/store';

export const currentCurrency: Readable<Currency> = derived(
	[currencyStore],
	([{ currency }]) => currency
);

export const currentCurrencyExchangeRate: Readable<number | null> = derived(
	[currencyExchangeStore],
	([{ exchangeRateToUsd }]) => exchangeRateToUsd
);
