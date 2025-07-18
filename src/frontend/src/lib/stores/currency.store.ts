import { Currency } from '$lib/enums/currency';
import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
import { initStorageStore } from '$lib/stores/storage.store';
import type { CurrencyData } from '$lib/types/currency';
import type { Readable } from 'svelte/store';

export interface CurrencyStore extends Readable<CurrencyData> {
	switchCurrency: (currency: CurrencyData['currency']) => void;
}

const CURRENCY_STORAGE_KEY = 'currency';

export const initCurrencyStore = (): CurrencyStore => {
	const DEFAULT: CurrencyData = { currency: Currency.USD };

	const { set, subscribe } = initStorageStore<CurrencyData>({
		key: CURRENCY_STORAGE_KEY,
		defaultValue: DEFAULT
	});

	return {
		switchCurrency: (currency: CurrencyData['currency']) => {
			set({ key: CURRENCY_STORAGE_KEY, value: { currency } });
			currencyExchangeStore.setExchangeRateCurrency(currency);
		},
		subscribe
	};
};

export const currencyStore = initCurrencyStore();
