import { nearIntentsSwapLimitFormatted } from '$lib/derived/near-intents-swap-limit.derived';
import { Currency } from '$lib/enums/currency';
import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
import { currencyStore } from '$lib/stores/currency.store';
import { nearIntentsSwapLimitStore } from '$lib/stores/near-intents-swap-limit.store';
import { get } from 'svelte/store';

describe('near-intents-swap-limit.derived', () => {
	beforeEach(() => {
		currencyStore.switchCurrency(Currency.USD);
		nearIntentsSwapLimitStore.reset();
	});

	afterEach(() => {
		currencyStore.switchCurrency(Currency.USD);
		nearIntentsSwapLimitStore.reset();
	});

	describe('nearIntentsSwapLimitFormatted', () => {
		it('should be undefined when the pair has no floor', () => {
			expect(get(nearIntentsSwapLimitFormatted)).toBeUndefined();
		});

		it('should state the floor in US dollars by default', () => {
			nearIntentsSwapLimitStore.set(1000);

			expect(get(nearIntentsSwapLimitFormatted)).toBe('$1,000.00');
		});

		it('should state the floor in the selected display currency', () => {
			currencyStore.switchCurrency(Currency.EUR);
			currencyExchangeStore.setExchangeRate(1.25);

			nearIntentsSwapLimitStore.set(1000);

			// $1,000 at 1.25 USD per EUR
			expect(get(nearIntentsSwapLimitFormatted)).toBe('€800.00');
		});

		// Switching currency clears the rate until the worker refreshes it. A figure with no currency
		// on it would be worse than saying nothing, and the forms that step aside for the notice rely
		// on this being undefined whenever the notice is not on screen.
		it('should be undefined while the selected currency has no exchange rate yet', () => {
			currencyStore.switchCurrency(Currency.EUR);

			nearIntentsSwapLimitStore.set(1000);

			expect(get(nearIntentsSwapLimitFormatted)).toBeUndefined();
		});

		it('should follow the floor when it changes', () => {
			nearIntentsSwapLimitStore.set(1000);
			nearIntentsSwapLimitStore.set(250);

			expect(get(nearIntentsSwapLimitFormatted)).toBe('$250.00');

			nearIntentsSwapLimitStore.reset();

			expect(get(nearIntentsSwapLimitFormatted)).toBeUndefined();
		});
	});
});
