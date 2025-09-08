import { TRACK_CHANGE_CURRENCY } from '$lib/constants/analytics.contants';
import { Currency } from '$lib/enums/currency';
import * as analytics from '$lib/services/analytics.services';
import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
import { initCurrencyStore, type CurrencyStore } from '$lib/stores/currency.store';
import type { CurrencyData } from '$lib/types/currency';
import { get as getStorage } from '$lib/utils/storage.utils';
import { mockAuthSignedIn } from '$tests/mocks/auth.mock';
import { get } from 'svelte/store';

vi.mock('$lib/utils/storage.utils', () => ({
	set: vi.fn(),
	get: vi.fn(),
	del: vi.fn()
}));

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('currency.store', () => {
	describe('initCurrencyStore', () => {
		const mockData: CurrencyData = { currency: Currency.CHF };

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

			expect(get(store)).toEqual({ currency: Currency.USD });
		});

		describe('switchCurrency', () => {
			it('should switch the currency', () => {
				expect(get(mockStore).currency).toEqual(Currency.USD);

				mockStore.switchCurrency(Currency.CHF);

				expect(get(mockStore).currency).toEqual(Currency.CHF);
			});

			it('should switch the currency back and forth', () => {
				expect(get(mockStore).currency).toEqual(Currency.USD);

				mockStore.switchCurrency(Currency.CHF);

				expect(get(mockStore).currency).toEqual(Currency.CHF);

				mockStore.switchCurrency(Currency.JPY);

				expect(get(mockStore).currency).toEqual(Currency.JPY);

				mockStore.switchCurrency(Currency.USD);

				expect(get(mockStore).currency).toEqual(Currency.USD);
			});

			it('should set the exchange rate to null for non-USD currencies', () => {
				expect(get(currencyExchangeStore).exchangeRateToUsd).toBe(1);

				mockStore.switchCurrency(Currency.CHF);

				expect(get(currencyExchangeStore).exchangeRateToUsd).toBeNull();
				expect(currencyExchangeStore.setExchangeRateCurrency).toHaveBeenCalledExactlyOnceWith(
					Currency.CHF
				);

				mockStore.switchCurrency(Currency.JPY);

				expect(get(currencyExchangeStore).exchangeRateToUsd).toBeNull();
				expect(currencyExchangeStore.setExchangeRateCurrency).toHaveBeenCalledTimes(2);
				expect(currencyExchangeStore.setExchangeRateCurrency).toHaveBeenNthCalledWith(
					2,
					Currency.JPY
				);
			});

			it('should set the exchange rate to 1 for USD', () => {
				mockStore.switchCurrency(Currency.CHF);

				expect(get(currencyExchangeStore).exchangeRateToUsd).toBeNull();
				expect(currencyExchangeStore.setExchangeRateCurrency).toHaveBeenCalledExactlyOnceWith(
					Currency.CHF
				);

				mockStore.switchCurrency(Currency.USD);

				expect(get(currencyExchangeStore).exchangeRateToUsd).toBe(1);
				expect(currencyExchangeStore.setExchangeRateCurrency).toHaveBeenCalledTimes(2);
				expect(currencyExchangeStore.setExchangeRateCurrency).toHaveBeenNthCalledWith(
					2,
					Currency.USD
				);
			});

			it('should track event when switching currency', () => {
				const spyTrackEvent = vi.spyOn(analytics, 'trackEvent');

				mockStore.switchCurrency(Currency.CHF);

				expect(spyTrackEvent).toHaveBeenCalledExactlyOnceWith({
					name: TRACK_CHANGE_CURRENCY,
					metadata: {
						currency: Currency.CHF,
						source: 'landing-page'
					}
				});

				vi.clearAllMocks();

				mockAuthSignedIn();

				mockStore.switchCurrency(Currency.EUR);

				expect(spyTrackEvent).toHaveBeenCalledExactlyOnceWith({
					name: TRACK_CHANGE_CURRENCY,
					metadata: {
						currency: Currency.EUR,
						source: 'app'
					}
				});
			});
		});
	});
});
