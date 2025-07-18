import { currentCurrency, currentCurrencyExchangeRate } from '$lib/derived/currency.derived';
import { Currency } from '$lib/enums/currency';
import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
import { currencyStore } from '$lib/stores/currency.store';
import { get } from 'svelte/store';

vi.mock('idb-keyval', () => ({
	createStore: vi.fn(() => ({
		/* mock store implementation */
	})),
	set: vi.fn(),
	get: vi.fn(),
	del: vi.fn(),
	update: vi.fn()
}));

describe('currency.derived', () => {
	describe('currentCurrency', () => {
		it('should initialize with the default currency', () => {
			expect(get(currentCurrency)).toEqual(Currency.USD);
		});

		it('should return the current currency from the currency store', () => {
			expect(get(currentCurrency)).toEqual(Currency.USD);

			currencyStore.switchCurrency(Currency.CHF);

			expect(get(currentCurrency)).toEqual(Currency.CHF);

			currencyStore.switchCurrency(Currency.EUR);

			expect(get(currentCurrency)).toEqual(Currency.EUR);
		});
	});

	describe('currentCurrencyExchangeRate', () => {
		beforeEach(() => {
			currencyExchangeStore.setExchangeRateCurrency(Currency.USD);
		});

		it('should initialize with the default value', () => {
			expect(get(currentCurrencyExchangeRate)).toEqual(1);
		});

		it('should return the current value from the currency store', () => {
			expect(get(currentCurrencyExchangeRate)).toEqual(1);

			currencyExchangeStore.setExchangeRate(101);

			expect(get(currentCurrencyExchangeRate)).toEqual(101);

			currencyExchangeStore.setExchangeRate(1.5);

			expect(get(currentCurrencyExchangeRate)).toEqual(1.5);
		});

		it('should return null if exchange rate is not set', () => {
			currencyExchangeStore.setExchangeRate(1.2);

			expect(get(currentCurrencyExchangeRate)).toEqual(1.2);

			currencyExchangeStore.setExchangeRate(null);

			expect(get(currentCurrencyExchangeRate)).toBeNull();
		});

		it('should return null when the language is switched', () => {
			currencyExchangeStore.setExchangeRate(1.2);

			expect(get(currentCurrencyExchangeRate)).toEqual(1.2);

			currencyExchangeStore.setExchangeRateCurrency(Currency.CHF);

			expect(get(currentCurrencyExchangeRate)).toBeNull();
		});

		it('should return null when the language is switched in the currencyStore', () => {
			currencyExchangeStore.setExchangeRate(1.2);

			expect(get(currentCurrencyExchangeRate)).toEqual(1.2);

			currencyStore.switchCurrency(Currency.CHF);

			expect(get(currentCurrencyExchangeRate)).toBeNull();
		});
	});
});
