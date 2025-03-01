import * as exchangeEnv from '$env/exchange.env';
import { exchangeInitialized, exchangeNotInitialized } from '$lib/derived/exchange.derived';
import { exchangeStore } from '$lib/stores/exchange.store';
import { get } from 'svelte/store';

describe('exchange.derived', () => {
	describe('exchangeInitialized', () => {
		beforeEach(() => {
			vi.spyOn(exchangeEnv, 'EXCHANGE_DISABLED', 'get').mockImplementation(() => false);
		});

		it('should return false when exchange store is empty', () => {
			expect(get(exchangeInitialized)).toBeFalsy();
		});

		it('should return true when exchange is disabled', () => {
			vi.spyOn(exchangeEnv, 'EXCHANGE_DISABLED', 'get').mockImplementationOnce(() => true);

			expect(get(exchangeInitialized)).toBeTruthy();
		});

		it('should return true when exchange store is not empty', () => {
			exchangeStore.set([{ ethereum: { usd: 1 } }]);

			expect(get(exchangeInitialized)).toBeTruthy();
		});

		it('should return false when exchange store is reset', () => {
			exchangeStore.set([{ ethereum: { usd: 1 } }]);
			exchangeStore.reset();

			expect(get(exchangeInitialized)).toBeFalsy();
		});
	});

	describe('exchangeNotInitialized', () => {
		beforeEach(() => {
			vi.spyOn(exchangeEnv, 'EXCHANGE_DISABLED', 'get').mockImplementation(() => false);
		});

		it('should return true when exchange store is empty', () => {
			expect(get(exchangeNotInitialized)).toBeTruthy();
		});

		it('should return false when exchange is disabled', () => {
			vi.spyOn(exchangeEnv, 'EXCHANGE_DISABLED', 'get').mockImplementationOnce(() => true);

			expect(get(exchangeNotInitialized)).toBeFalsy();
		});

		it('should return false when exchange store is not empty', () => {
			exchangeStore.set([{ ethereum: { usd: 1 } }]);

			expect(get(exchangeNotInitialized)).toBeFalsy();
		});

		it('should return true when exchange store is reset', () => {
			exchangeStore.set([{ ethereum: { usd: 1 } }]);
			exchangeStore.reset();

			expect(get(exchangeNotInitialized)).toBeTruthy();
		});
	});
});
