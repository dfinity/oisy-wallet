import { KONGSWAP_API_URL } from '$env/rest/kongswap.env';
import { fetchBatchKongSwapPrices, getKongSwapTokenById } from '$lib/rest/kongswap.rest';
import type { KongSwapToken } from '$lib/types/kongswap';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const MOCK_CANISTER_ID = 'aaaaa-aa';
const OTHER_CANISTER_ID = 'bbbbb-bb';
const EXPECTED_ENDPOINT = `${KONGSWAP_API_URL}/tokens/${MOCK_CANISTER_ID}`;

const mockTokenResponse: KongSwapToken = {
	token: {
		token_id: 1,
		name: 'Kong Token',
		symbol: 'KONG',
		canister_id: MOCK_CANISTER_ID,
		address: '0xabc123',
		decimals: 8,
		fee: 10,
		fee_fixed: null,
		has_custom_logo: false,
		icrc1: true,
		icrc2: true,
		icrc3: false,
		is_removed: false,
		logo_url: null,
		logo_updated_at: null,
		token_type: 'icrc1'
	},
	metrics: {
		token_id: 1,
		total_supply: '100000000',
		market_cap: '500000',
		price: '0.1234',
		updated_at: '2024-03-24T10:00:00.000Z',
		volume_24h: '25000',
		tvl: '100000',
		price_change_24h: '0.01',
		previous_price: '0.122'
	}
};

describe('KongSwap REST client', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	global.fetch = vi.fn();

	describe('getKongSwapTokenById', () => {
		it('fetches and returns a KongSwapToken successfully', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => mockTokenResponse
			} as unknown as Response);

			const result = await getKongSwapTokenById(MOCK_CANISTER_ID);
			expect(fetch).toHaveBeenCalledWith(EXPECTED_ENDPOINT, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' }
			});
			expect(result).toEqual(mockTokenResponse);
		});

		it('throws when fetch response is not ok', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false
			} as Response);

			await expect(getKongSwapTokenById(MOCK_CANISTER_ID)).rejects.toThrow(
				'Fetching KongSwap failed.'
			);
		});
	});

	describe('fetchBatchKongSwapPrices', () => {
		it('fetches all prices and returns valid array of results', async () => {
			vi.mocked(fetch)
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockTokenResponse)
				} as unknown as Response)
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockTokenResponse)
				} as unknown as Response);

			const result = await fetchBatchKongSwapPrices([MOCK_CANISTER_ID, OTHER_CANISTER_ID]);

			expect(fetch).toHaveBeenCalledTimes(2);
			expect(result).toEqual([mockTokenResponse, mockTokenResponse]);
		});

		it('handles partial failures and returns null for failed tokens', async () => {
			vi.mocked(fetch)
				.mockResolvedValueOnce({
					ok: true,
					json: () => mockTokenResponse
				} as unknown as Response)
				.mockResolvedValueOnce({
					ok: false
				} as Response);

			const result = await fetchBatchKongSwapPrices([MOCK_CANISTER_ID, OTHER_CANISTER_ID]);
			expect(result).toEqual([mockTokenResponse, null]);
		});

		it('returns null if JSON parsing fails', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => {
					throw new Error('JSON error');
				}
			} as unknown as Response);

			const result = await fetchBatchKongSwapPrices([MOCK_CANISTER_ID]);
			expect(result).toEqual([null]);
		});
	});
});
