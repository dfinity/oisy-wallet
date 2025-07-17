import { Currencies } from '$lib/enums/currencies';
import type { CurrencyData } from '$lib/stores/currency.store';
import { writable, type Readable } from 'svelte/store';

export interface CurrencyExchangeData extends CurrencyData {
	exchangeRateToUsd: number | null;
}

export interface CurrencyExchangeStore extends Readable<CurrencyExchangeData> {
	setExchangeRateCurrency: (currency: CurrencyExchangeData['currency']) => void;
	setExchangeRate: (exchangeRate: CurrencyExchangeData['exchangeRateToUsd']) => void;
}

// Since the currencyStore is a type of storage store, we cannot use it in the workers (no browser API support), especially in the one that updates the exchange rate of the current currency.
// So we split the currency store into two separate stores: one for the currency and another for the exchange rate.
export const initCurrencyExchangeStore = (): CurrencyExchangeStore => {
	const DEFAULT: CurrencyExchangeData = {
		currency: Currencies.USD,
		exchangeRateToUsd: 1
	};

	const { subscribe, set, update } = writable<CurrencyExchangeData>(DEFAULT);

	return {
		setExchangeRateCurrency: (currency: CurrencyExchangeData['currency']) => {
			// When the currency changes, we reset the exchange rate to null to avoid showing wrong data in the UI
			set({ currency, exchangeRateToUsd: currency === Currencies.USD ? 1 : null });
		},
		setExchangeRate: (exchangeRate: CurrencyExchangeData['exchangeRateToUsd']) =>
			update((state) => ({ ...state, exchangeRateToUsd: exchangeRate })),
		subscribe
	};
};

export const currencyExchangeStore = initCurrencyExchangeStore();
