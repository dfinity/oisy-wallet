import { Currencies } from '$lib/enums/currencies';
import {
	initCurrencyExchangeStore,
	type CurrencyExchangeStore
} from '$lib/stores/currency-exchange.store';
import { get } from 'svelte/store';

describe('currency-exchange.store', () => {
	describe('initCurrencyExchangeStore', () => {
		let mockStore: CurrencyExchangeStore;

		beforeEach(() => {
			vi.clearAllMocks();

			mockStore = initCurrencyExchangeStore();
		});

		it('should initialize with default value', () => {
			const store = initCurrencyExchangeStore();

			expect(get(store)).toEqual({
				currency: Currencies.USD,
				exchangeRateToUsd: 1
			});
		});

		describe('setExchangeRateCurrency', () => {
			it('should switch the currency', () => {
				expect(get(mockStore).currency).toEqual(Currencies.USD);

				mockStore.setExchangeRateCurrency(Currencies.CHF);

				expect(get(mockStore).currency).toEqual(Currencies.CHF);
			});

			it('should switch the currency back and forth', () => {
				expect(get(mockStore).currency).toEqual(Currencies.USD);

				mockStore.setExchangeRateCurrency(Currencies.CHF);

				expect(get(mockStore).currency).toEqual(Currencies.CHF);

				mockStore.setExchangeRateCurrency(Currencies.JPY);

				expect(get(mockStore).currency).toEqual(Currencies.JPY);

				mockStore.setExchangeRateCurrency(Currencies.USD);

				expect(get(mockStore).currency).toEqual(Currencies.USD);
			});

			it('should set the exchange rate to null for non-USD currencies', () => {
				expect(get(mockStore).exchangeRateToUsd).toBe(1);

				mockStore.setExchangeRateCurrency(Currencies.CHF);

				expect(get(mockStore).exchangeRateToUsd).toBeNull();

				mockStore.setExchangeRateCurrency(Currencies.JPY);

				expect(get(mockStore).exchangeRateToUsd).toBeNull();
			});

			it('should set the exchange rate to 1 for USD', () => {
				expect(get(mockStore).exchangeRateToUsd).toBe(1);

				mockStore.setExchangeRateCurrency(Currencies.CHF);

				expect(get(mockStore).exchangeRateToUsd).toBeNull();

				mockStore.setExchangeRateCurrency(Currencies.USD);

				expect(get(mockStore).exchangeRateToUsd).toBe(1);
			});
		});

		describe('setExchangeRate', () => {
			it('should set the exchange rate', () => {
				expect(get(mockStore).exchangeRateToUsd).toBe(1);

				mockStore.setExchangeRate(1.5);

				expect(get(mockStore).exchangeRateToUsd).toBe(1.5);

				mockStore.setExchangeRate(101);

				expect(get(mockStore).exchangeRateToUsd).toBe(101);
			});

			it('should not change the currency', () => {
				expect(get(mockStore).currency).toEqual(Currencies.USD);

				mockStore.setExchangeRate(1.5);

				expect(get(mockStore).currency).toEqual(Currencies.USD);

				mockStore.setExchangeRate(101);

				expect(get(mockStore).currency).toEqual(Currencies.USD);
			});
		});
	});
});
