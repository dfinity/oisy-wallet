import type { CoingeckoSimpleTokenPriceResponse } from '$lib/types/coingecko';
import {
	findMissingLedgerCanisterIds,
	formatKongSwapToCoingeckoPrices
} from '$lib/utils/exchange.utils';
import { MOCK_CANISTER_ID_1, MOCK_CANISTER_ID_2 } from '$tests/mocks/exchanges.mock';
import { createMockKongSwapToken } from '$tests/mocks/kongswap.mock';

describe('formatKongSwapToCoingeckoPrices', () => {
	it('converts valid token to coingecko price format', () => {
		const mock = createMockKongSwapToken({
			token: { canister_id: MOCK_CANISTER_ID_1 },
			metrics: {
				price: 1.23,
				market_cap: 1000000,
				volume_24h: 50000,
				price_change_24h: 2.5,
				updated_at: '2024-01-01T00:00:00.000Z'
			}
		});

		const result = formatKongSwapToCoingeckoPrices([mock]);

		expect(result[MOCK_CANISTER_ID_1.toLowerCase()]).toEqual({
			usd: 1.23,
			usd_market_cap: 1_000_000,
			usd_24h_vol: 50_000,
			usd_24h_change: 2.5,
			last_updated_at: new Date('2024-01-01T00:00:00.000Z').getTime()
		});
	});

	it('skips tokenData where metrics.price is null', () => {
		const mock = createMockKongSwapToken({
			metrics: { price: null as unknown as number }
		});
		const result = formatKongSwapToCoingeckoPrices([mock]);

		expect(result).toEqual({});
	});

	it('skips tokenData where metrics.price is 0', () => {
		const mock = createMockKongSwapToken({
			metrics: { price: 0 }
		});
		const result = formatKongSwapToCoingeckoPrices([mock]);

		expect(result).toEqual({});
	});

	it('parses even if some optional metrics fields are missing', () => {
		const mock = createMockKongSwapToken({
			token: { canister_id: MOCK_CANISTER_ID_1 },
			metrics: {
				price: 1.0,
				market_cap: undefined as unknown as number,
				volume_24h: undefined as unknown as number,
				price_change_24h: undefined as unknown as number,
				updated_at: '2024-01-01T00:00:00.000Z'
			}
		});
		const result = formatKongSwapToCoingeckoPrices([mock]);

		expect(result[MOCK_CANISTER_ID_1.toLowerCase()].usd).toBe(1);
		expect(result[MOCK_CANISTER_ID_1.toLowerCase()].usd_market_cap).toBeNaN();
	});
});

describe('findMissingCanisterIds', () => {
	it('returns empty array when all IDs are found in response', () => {
		const response: CoingeckoSimpleTokenPriceResponse = {
			[MOCK_CANISTER_ID_1.toLowerCase()]: {
				usd: 1,
				usd_market_cap: 1000,
				usd_24h_vol: 500,
				usd_24h_change: 2,
				last_updated_at: 1700000000
			}
		};

		const result = findMissingLedgerCanisterIds({
			allLedgerCanisterIds: [MOCK_CANISTER_ID_1],
			coingeckoResponse: response
		});

		expect(result).toEqual([]);
	});

	it('returns missing IDs not in coingecko response', () => {
		const response: CoingeckoSimpleTokenPriceResponse = {
			[MOCK_CANISTER_ID_1.toLowerCase()]: {
				usd: 1,
				usd_market_cap: 1000,
				usd_24h_vol: 500,
				usd_24h_change: 2,
				last_updated_at: 1700000000
			}
		};

		const result = findMissingLedgerCanisterIds({
			allLedgerCanisterIds: [MOCK_CANISTER_ID_1, MOCK_CANISTER_ID_2],
			coingeckoResponse: response
		});

		expect(result).toEqual([MOCK_CANISTER_ID_2]);
	});

	it('returns all IDs if response is null', () => {
		const result = findMissingLedgerCanisterIds({
			allLedgerCanisterIds: [MOCK_CANISTER_ID_1, MOCK_CANISTER_ID_2],
			coingeckoResponse: null
		});

		expect(result).toEqual([MOCK_CANISTER_ID_1, MOCK_CANISTER_ID_2]);
	});

	it('returns empty array if allLedgerCanisterIds is empty', () => {
		const result = findMissingLedgerCanisterIds({
			allLedgerCanisterIds: [],
			coingeckoResponse: null
		});

		expect(result).toEqual([]);
	});

	it('handles case-insensitive matching of canister IDs', () => {
		const response: CoingeckoSimpleTokenPriceResponse = {
			[MOCK_CANISTER_ID_1.toLowerCase()]: {
				usd: 1,
				usd_market_cap: 1000,
				usd_24h_vol: 500,
				usd_24h_change: 2,
				last_updated_at: 1700000000
			}
		};

		const result = findMissingLedgerCanisterIds({
			allLedgerCanisterIds: ['AAAAA-AA'],
			coingeckoResponse: response
		});

		expect(result).toEqual([]);
	});

	it('ignores unrelated extra keys in response', () => {
		const response: CoingeckoSimpleTokenPriceResponse = {
			'not-a-canister-id': {
				usd: 0,
				usd_market_cap: 0,
				usd_24h_vol: 0,
				usd_24h_change: 0,
				last_updated_at: 0
			}
		};

		const result = findMissingLedgerCanisterIds({
			allLedgerCanisterIds: [MOCK_CANISTER_ID_1],
			coingeckoResponse: response
		});

		expect(result).toEqual([MOCK_CANISTER_ID_1]);
	});
});
