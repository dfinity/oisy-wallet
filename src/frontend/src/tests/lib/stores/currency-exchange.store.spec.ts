import { Currency } from '$lib/enums/currency';
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
				currency: Currency.USD,
				exchangeRateToUsd: 1
			});
		});

		describe('setExchangeRateCurrency', () => {
			it('should switch the currency', () => {
				expect(get(mockStore).currency).toEqual(Currency.USD);

				mockStore.setExchangeRateCurrency(Currency.CHF);

				expect(get(mockStore).currency).toEqual(Currency.CHF);
			});

			it('should switch the currency back and forth', () => {
				expect(get(mockStore).currency).toEqual(Currency.USD);

				mockStore.setExchangeRateCurrency(Currency.CHF);

				expect(get(mockStore).currency).toEqual(Currency.CHF);

				mockStore.setExchangeRateCurrency(Currency.JPY);

				expect(get(mockStore).currency).toEqual(Currency.JPY);

				mockStore.setExchangeRateCurrency(Currency.USD);

				expect(get(mockStore).currency).toEqual(Currency.USD);
			});

			it('should set the exchange rate to null for non-USD currencies', () => {
				expect(get(mockStore).exchangeRateToUsd).toBe(1);

				mockStore.setExchangeRateCurrency(Currency.CHF);

				expect(get(mockStore).exchangeRateToUsd).toBeNull();

				mockStore.setExchangeRateCurrency(Currency.JPY);

				expect(get(mockStore).exchangeRateToUsd).toBeNull();
			});

			it('should set the exchange rate to 1 for USD', () => {
				expect(get(mockStore).exchangeRateToUsd).toBe(1);

				mockStore.setExchangeRateCurrency(Currency.CHF);

				expect(get(mockStore).exchangeRateToUsd).toBeNull();

				mockStore.setExchangeRateCurrency(Currency.USD);

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
				expect(get(mockStore).currency).toEqual(Currency.USD);

				mockStore.setExchangeRate(1.5);

				expect(get(mockStore).currency).toEqual(Currency.USD);

				mockStore.setExchangeRate(101);

				expect(get(mockStore).currency).toEqual(Currency.USD);
			});
		});
	});
});
