import { Currencies } from '$lib/enums/currencies';
import { initStorageStore } from '$lib/stores/storage.store';
import type { Readable } from 'svelte/store';

export interface CurrencyData {
	currency: Currencies;
	exchangeRateToUsd: number | null;
}

export interface CurrencyStore extends Readable<CurrencyData> {
	switchCurrency: (currency: CurrencyData['currency']) => void;
	setExchangeRate: (exchangeRate: CurrencyData['exchangeRateToUsd']) => void;
}

const CURRENCY_STORAGE_KEY = 'currency';

export const initCurrencyStore = (): CurrencyStore => {
	const DEFAULT: CurrencyData = {
		currency: Currencies.USD,
		exchangeRateToUsd: 1
	};

	const { set, subscribe, update } = initStorageStore<CurrencyData>({
		key: CURRENCY_STORAGE_KEY,
		defaultValue: DEFAULT
	});

	return {
		switchCurrency: (currency: CurrencyData['currency']) =>
			// When the currency changes, we reset the exchange rate to null to avoid showing wrong data in the UI
			set({
				key: CURRENCY_STORAGE_KEY,
				value: { currency, exchangeRateToUsd: currency === Currencies.USD ? 1 : null }
			}),
		setExchangeRate: (exchangeRate: CurrencyData['exchangeRateToUsd']) =>
			update((state) => ({ ...state, exchangeRateToUsd: exchangeRate })),
		subscribe
	};
};

export const currencyStore = initCurrencyStore();
