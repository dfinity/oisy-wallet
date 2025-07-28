import { KONGSWAP_API_URL } from '$env/rest/kongswap.env';
import { fetchBatchKongSwapPrices, getKongSwapTokenById } from '$lib/rest/kongswap.rest';
import { MOCK_CANISTER_ID_1, MOCK_CANISTER_ID_2 } from '$tests/mocks/exchanges.mock';
import { createMockKongSwapToken } from '$tests/mocks/kongswap.mock';

const EXPECTED_ENDPOINT = `${KONGSWAP_API_URL}/tokens/${MOCK_CANISTER_ID_1}`;
const mockTokenResponse = createMockKongSwapToken({});

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

			const result = await getKongSwapTokenById(MOCK_CANISTER_ID_1);

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

			await expect(getKongSwapTokenById(MOCK_CANISTER_ID_1)).rejects.toThrow(
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

			const result = await fetchBatchKongSwapPrices([MOCK_CANISTER_ID_1, MOCK_CANISTER_ID_2]);

			expect(fetch).toHaveBeenCalledTimes(2);
			expect(result).toEqual([mockTokenResponse, mockTokenResponse]);
		});

		it('excludes failed responses from result array', async () => {
			vi.mocked(fetch)
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockTokenResponse)
				} as unknown as Response)
				.mockResolvedValueOnce({
					ok: false
				} as unknown as Response);

			const result = await fetchBatchKongSwapPrices([MOCK_CANISTER_ID_1, MOCK_CANISTER_ID_2]);

			expect(fetch).toHaveBeenCalledTimes(2);
			expect(result).toEqual([mockTokenResponse]);
		});

		it('excludes tokens if JSON parsing fails', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => {
					throw new Error('JSON error');
				}
			} as unknown as Response);

			const result = await fetchBatchKongSwapPrices([MOCK_CANISTER_ID_1]);

			expect(fetch).toHaveBeenCalledOnce();
			expect(result).toEqual([]);
		});

		it('returns an empty array if all requests fail', async () => {
			vi.mocked(fetch)
				.mockResolvedValueOnce({
					ok: false
				} as unknown as Response)
				.mockResolvedValueOnce({
					ok: false
				} as unknown as Response);

			const result = await fetchBatchKongSwapPrices([MOCK_CANISTER_ID_1, MOCK_CANISTER_ID_2]);

			expect(fetch).toHaveBeenCalledTimes(2);
			expect(result).toEqual([]);
		});

		it('skips token when token field is null', async () => {
			const invalidResponse = { token: null, metrics: { price: '1.23' } };

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(invalidResponse)
			} as unknown as Response);

			const result = await fetchBatchKongSwapPrices([MOCK_CANISTER_ID_1]);

			expect(fetch).toHaveBeenCalledOnce();
			expect(result).toEqual([]);
		});

		it('skips token when metrics field is null', async () => {
			const invalidResponse = { token: { canister_id: MOCK_CANISTER_ID_1 }, metrics: null };

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(invalidResponse)
			} as unknown as Response);

			const result = await fetchBatchKongSwapPrices([MOCK_CANISTER_ID_1]);

			expect(fetch).toHaveBeenCalledOnce();
			expect(result).toEqual([]);
		});
	});
});
