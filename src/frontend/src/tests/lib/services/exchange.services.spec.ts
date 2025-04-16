import { exchangeRateICRCToUsd } from '$lib/services/exchange.services';
import type { CoingeckoSimpleTokenPriceResponse } from '$lib/types/coingecko';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { simpleTokenPrice } from '$lib/rest/coingecko.rest';
import { fetchBatchKongSwapPrices } from '$lib/rest/kongswap.rest';
import {
	findMissingLedgerCanisterIds,
	formatKongSwapToCoingeckoPrices
} from '$lib/utils/exchange.utils';
import {
	MOCK_CANISTER_ID_1,
	MOCK_CANISTER_ID_2,
	createMockCoingeckoTokenPrice
} from '$tests/mocks/exchanges.mock';

vi.mock('$lib/rest/coingecko.rest', () => ({
	simpleTokenPrice: vi.fn()
}));
vi.mock('$lib/rest/kongswap.rest', () => ({
	fetchBatchKongSwapPrices: vi.fn()
}));
vi.mock('$lib/utils/exchange.utils', () => ({
	formatKongSwapToCoingeckoPrices: vi.fn(),
	findMissingLedgerCanisterIds: vi.fn()
}));

const mockPrice1 = createMockCoingeckoTokenPrice({ usd: 1.11 });
const mockPrice2 = createMockCoingeckoTokenPrice({ usd: 2.22 });

describe('exchangeRateICRCToUsd', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns null if no canister IDs are provided', async () => {
		const result = await exchangeRateICRCToUsd([]);

		expect(result).toBeNull();
		expect(simpleTokenPrice).not.toHaveBeenCalled();
		expect(findMissingLedgerCanisterIds).not.toHaveBeenCalled();
		expect(fetchBatchKongSwapPrices).not.toHaveBeenCalled();
	});

	it('returns only coingecko prices when all tokens are present', async () => {
		const coingeckoResponse: CoingeckoSimpleTokenPriceResponse = {
			[MOCK_CANISTER_ID_1.toLowerCase()]: mockPrice1,
			[MOCK_CANISTER_ID_2.toLowerCase()]: mockPrice2
		};

		vi.mocked(simpleTokenPrice).mockResolvedValue(coingeckoResponse);
		vi.mocked(findMissingLedgerCanisterIds).mockReturnValue([]);

		const result = await exchangeRateICRCToUsd([MOCK_CANISTER_ID_1, MOCK_CANISTER_ID_2]);

		expect(simpleTokenPrice).toHaveBeenCalledOnce();
		expect(findMissingLedgerCanisterIds).toHaveBeenCalledWith({
			allLedgerCanisterIds: [MOCK_CANISTER_ID_1, MOCK_CANISTER_ID_2],
			coingeckoResponse
		});
		expect(fetchBatchKongSwapPrices).not.toHaveBeenCalled();
		expect(result).toEqual(coingeckoResponse);
	});

	it('merges KongSwap prices when Coingecko is missing some tokens', async () => {
		const partialCoingecko: CoingeckoSimpleTokenPriceResponse = {
			[MOCK_CANISTER_ID_1.toLowerCase()]: mockPrice1
		};
		const fallbackKongSwap: CoingeckoSimpleTokenPriceResponse = {
			[MOCK_CANISTER_ID_2.toLowerCase()]: mockPrice2
		};

		vi.mocked(simpleTokenPrice).mockResolvedValue(partialCoingecko);
		vi.mocked(findMissingLedgerCanisterIds).mockReturnValue([MOCK_CANISTER_ID_2]);
		vi.mocked(fetchBatchKongSwapPrices).mockResolvedValue(['mockRawToken' as never]);
		vi.mocked(formatKongSwapToCoingeckoPrices).mockReturnValue(fallbackKongSwap);

		const result = await exchangeRateICRCToUsd([MOCK_CANISTER_ID_1, MOCK_CANISTER_ID_2]);

		expect(simpleTokenPrice).toHaveBeenCalledOnce();
		expect(findMissingLedgerCanisterIds).toHaveBeenCalledWith({
			allLedgerCanisterIds: [MOCK_CANISTER_ID_1, MOCK_CANISTER_ID_2],
			coingeckoResponse: partialCoingecko
		});
		expect(fetchBatchKongSwapPrices).toHaveBeenCalledWith([MOCK_CANISTER_ID_2]);
		expect(formatKongSwapToCoingeckoPrices).toHaveBeenCalled();
		expect(result).toEqual({
			[MOCK_CANISTER_ID_1.toLowerCase()]: mockPrice1,
			[MOCK_CANISTER_ID_2.toLowerCase()]: mockPrice2
		});
	});

	it('returns only KongSwap prices if Coingecko returns null', async () => {
		vi.mocked(simpleTokenPrice).mockResolvedValue(null);
		vi.mocked(findMissingLedgerCanisterIds).mockReturnValue([MOCK_CANISTER_ID_1]);
		vi.mocked(fetchBatchKongSwapPrices).mockResolvedValue(['mockRawToken' as never]);
		vi.mocked(formatKongSwapToCoingeckoPrices).mockReturnValue({
			[MOCK_CANISTER_ID_1.toLowerCase()]: mockPrice1
		});

		const result = await exchangeRateICRCToUsd([MOCK_CANISTER_ID_1]);

		expect(simpleTokenPrice).toHaveBeenCalledOnce();
		expect(fetchBatchKongSwapPrices).toHaveBeenCalled();
		expect(result).toEqual({
			[MOCK_CANISTER_ID_1.toLowerCase()]: mockPrice1
		});
	});

	it('skips KongSwap call if no tokens are missing', async () => {
		const coingeckoResponse: CoingeckoSimpleTokenPriceResponse = {
			[MOCK_CANISTER_ID_1.toLowerCase()]: mockPrice1
		};

		vi.mocked(simpleTokenPrice).mockResolvedValue(coingeckoResponse);
		vi.mocked(findMissingLedgerCanisterIds).mockReturnValue([]);

		const result = await exchangeRateICRCToUsd([MOCK_CANISTER_ID_1]);

		expect(fetchBatchKongSwapPrices).not.toHaveBeenCalled();
		expect(formatKongSwapToCoingeckoPrices).not.toHaveBeenCalled();
		expect(result).toEqual(coingeckoResponse);
	});
});
