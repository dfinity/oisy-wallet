import { Currencies } from '$lib/enums/currencies';
import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
import { initCurrencyStore, type CurrencyStore } from '$lib/stores/currency.store';
import type { CurrencyData } from '$lib/types/currency';
import { get as getStorage } from '$lib/utils/storage.utils';
import { get } from 'svelte/store';

vi.mock('$lib/utils/storage.utils', () => ({
	set: vi.fn(),
	get: vi.fn(),
	del: vi.fn()
}));

describe('currency.store', () => {
	describe('initCurrencyStore', () => {
		const mockData: CurrencyData = { currency: Currencies.CHF };

		let mockStore: CurrencyStore;

		beforeEach(() => {
			vi.clearAllMocks();

			vi.mocked(getStorage).mockImplementation(() => {});

			mockStore = initCurrencyStore();

			vi.spyOn(currencyExchangeStore, 'setExchangeRateCurrency');
		});

		it('should initialize with the value from storage', () => {
			vi.mocked(getStorage).mockImplementation(() => mockData);

			const store = initCurrencyStore();

			expect(get(store)).toEqual(mockData);
		});

		it('should initialize with default value if no value is stored', () => {
			vi.mocked(getStorage).mockImplementation(() => undefined);

			const store = initCurrencyStore();

			expect(get(store)).toEqual({ currency: Currencies.USD });
		});

		describe('switchCurrency', () => {
			it('should switch the currency', () => {
				expect(get(mockStore).currency).toEqual(Currencies.USD);

				mockStore.switchCurrency(Currencies.CHF);

				expect(get(mockStore).currency).toEqual(Currencies.CHF);
			});

			it('should switch the currency back and forth', () => {
				expect(get(mockStore).currency).toEqual(Currencies.USD);

				mockStore.switchCurrency(Currencies.CHF);

				expect(get(mockStore).currency).toEqual(Currencies.CHF);

				mockStore.switchCurrency(Currencies.JPY);

				expect(get(mockStore).currency).toEqual(Currencies.JPY);

				mockStore.switchCurrency(Currencies.USD);

				expect(get(mockStore).currency).toEqual(Currencies.USD);
			});

			it('should set the exchange rate to null for non-USD currencies', () => {
				expect(get(currencyExchangeStore).exchangeRateToUsd).toBe(1);

				mockStore.switchCurrency(Currencies.CHF);

				expect(get(currencyExchangeStore).exchangeRateToUsd).toBeNull();
				expect(currencyExchangeStore.setExchangeRateCurrency).toHaveBeenCalledExactlyOnceWith(
					Currencies.CHF
				);

				mockStore.switchCurrency(Currencies.JPY);

				expect(get(currencyExchangeStore).exchangeRateToUsd).toBeNull();
				expect(currencyExchangeStore.setExchangeRateCurrency).toHaveBeenCalledTimes(2);
				expect(currencyExchangeStore.setExchangeRateCurrency).toHaveBeenNthCalledWith(
					2,
					Currencies.JPY
				);
			});

			it('should set the exchange rate to 1 for USD', () => {
				mockStore.switchCurrency(Currencies.CHF);

				expect(get(currencyExchangeStore).exchangeRateToUsd).toBeNull();
				expect(currencyExchangeStore.setExchangeRateCurrency).toHaveBeenCalledExactlyOnceWith(
					Currencies.CHF
				);

				mockStore.switchCurrency(Currencies.USD);

				expect(get(currencyExchangeStore).exchangeRateToUsd).toBe(1);
				expect(currencyExchangeStore.setExchangeRateCurrency).toHaveBeenCalledTimes(2);
				expect(currencyExchangeStore.setExchangeRateCurrency).toHaveBeenNthCalledWith(
					2,
					Currencies.USD
				);
			});
		});
	});
});
