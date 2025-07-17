import { Currencies } from '$lib/enums/currencies';
import {
	initCurrencyStore,
	type CurrencyData,
	type CurrencyStore
} from '$lib/stores/currency.store';
import { get as getStorage } from '$lib/utils/storage.utils';
import { get } from 'svelte/store';

vi.mock('$lib/utils/storage.utils', () => ({
	set: vi.fn(),
	get: vi.fn(),
	del: vi.fn()
}));

describe('currency.store', () => {
	describe('initCurrencyStore', () => {
		const mockData: CurrencyData = { currency: Currencies.CHF, exchangeRateToUsd: 1.5 };

		let mockStore: CurrencyStore;

		beforeEach(() => {
			vi.clearAllMocks();

			vi.mocked(getStorage).mockImplementation(() => {});

			mockStore = initCurrencyStore();
		});

		it('should initialize with the value from storage', () => {
			vi.mocked(getStorage).mockImplementation(() => mockData);

			const store = initCurrencyStore();

			expect(get(store)).toEqual(mockData);
		});

		it('should initialize with default value if no value is stored', () => {
			vi.mocked(getStorage).mockImplementation(() => undefined);

			const store = initCurrencyStore();

			expect(get(store)).toEqual({
				currency: Currencies.USD,
				exchangeRateToUsd: 1
			});
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
				expect(get(mockStore).exchangeRateToUsd).toBe(1);

				mockStore.switchCurrency(Currencies.CHF);

				expect(get(mockStore).exchangeRateToUsd).toBeNull();

				mockStore.switchCurrency(Currencies.JPY);

				expect(get(mockStore).exchangeRateToUsd).toBeNull();
			});

			it('should set the exchange rate to 1 for USD', () => {
				expect(get(mockStore).exchangeRateToUsd).toBe(1);

				mockStore.switchCurrency(Currencies.CHF);

				expect(get(mockStore).exchangeRateToUsd).toBeNull();

				mockStore.switchCurrency(Currencies.USD);

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
