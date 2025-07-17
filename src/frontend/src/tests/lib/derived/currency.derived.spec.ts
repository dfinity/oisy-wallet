import { currentCurrency } from '$lib/derived/currency.derived';
import { Currencies } from '$lib/enums/currencies';
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
			expect(get(currentCurrency)).toEqual(Currencies.USD);
		});

		it('should return the current currency from the currency store', () => {
			expect(get(currentCurrency)).toEqual(Currencies.USD);

			currencyStore.switchCurrency(Currencies.CHF);

			expect(get(currentCurrency)).toEqual(Currencies.CHF);

			currencyStore.switchCurrency(Currencies.EUR);

			expect(get(currentCurrency)).toEqual(Currencies.EUR);
		});
	});
});
