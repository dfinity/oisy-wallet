import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { CoingeckoSimpleTokenPriceResponse } from '$lib/types/coingecko';
import { findMissingCanisterIds, formatKongSwapToCoingeckoPrices } from '$lib/utils/exchange.utils';
import {
	createMockCoingeckoTokenPrice,
	createMockKongSwapToken
} from '$tests/mocks/exchanges.mock';
import { describe, expect, it } from 'vitest';

describe('formatKongSwapToCoingeckoPrices', () => {
	it('formats a valid token correctly', () => {
		const token = createMockKongSwapToken('test-canister-1');
		const result = formatKongSwapToCoingeckoPrices([token]);

		expect(result).toHaveProperty('test-canister-1');
		expect(result['test-canister-1'].usd).toBe(1);
		expect(result['test-canister-1'].usd_market_cap).toBe(1000000);
	});

	it('skips null tokens', () => {
		const result = formatKongSwapToCoingeckoPrices([null]);
		expect(result).toEqual({});
	});

	it('skips tokens with missing canister_id', () => {
		const token = createMockKongSwapToken('test', {
			token: { canister_id: '' }
		});
		const result = formatKongSwapToCoingeckoPrices([token]);
		expect(result).toEqual({});
	});

	it('skips tokens with missing price', () => {
		const token = createMockKongSwapToken('test-canister-2', {
			metrics: { price: null as unknown as string }
		});
		const result = formatKongSwapToCoingeckoPrices([token]);
		expect(result).toEqual({});
	});

	it('normalizes canister_id to lowercase', () => {
		const token = createMockKongSwapToken('TeSt-CaNiStEr-3');
		const result = formatKongSwapToCoingeckoPrices([token]);

		expect(result).toHaveProperty('test-canister-3');
	});
});

describe('findMissingCanisterIds', () => {
	it('returns IDs not found in coingecko response', () => {
		const allIds: LedgerCanisterIdText[] = ['can-1', 'can-2', 'can-3'];
		const coingecko: CoingeckoSimpleTokenPriceResponse = {
			'can-1': createMockCoingeckoTokenPrice()
		};

		const result = findMissingCanisterIds(allIds, coingecko);
		expect(result).toEqual(['can-2', 'can-3']);
	});

	it('returns all IDs if response is null', () => {
		const ids: LedgerCanisterIdText[] = ['can-4', 'can-5'];
		const result = findMissingCanisterIds(ids, null);
		expect(result).toEqual(ids);
	});

	it('matches canister IDs case-insensitively', () => {
		const ids: LedgerCanisterIdText[] = ['CAN-1', 'can-2'];
		const coingecko: CoingeckoSimpleTokenPriceResponse = {
			'can-1': createMockCoingeckoTokenPrice()
		};
		const result = findMissingCanisterIds(ids, coingecko);
		expect(result).toEqual(['can-2']);
	});
});
