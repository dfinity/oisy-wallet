import { ICPSWAP_API_URL } from '$env/rest/icpswap.env';
import { fetchBatchIcpSwapPrices, getIcpSwapTokenById } from '$lib/rest/icpswap.rest';
import { MOCK_CANISTER_ID_1, MOCK_CANISTER_ID_2 } from '$tests/mocks/exchanges.mock';
import { createMockIcpSwapToken } from '$tests/mocks/icpswap.mock';

describe('ICPSwap REST client', () => {
	const mockToken = createMockIcpSwapToken({ tokenLedgerId: MOCK_CANISTER_ID_1 });
	const mockApiResponse = { code: 200, message: null, data: mockToken };

	const EXPECTED_ENDPOINT = `${ICPSWAP_API_URL}/info/token/${MOCK_CANISTER_ID_1}`;

	beforeEach(() => {
		vi.resetAllMocks();
	});

	global.fetch = vi.fn();

	describe('getIcpSwapTokenById', () => {
		it('fetches and returns an IcpSwapToken successfully', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockApiResponse)
			} as unknown as Response);

			const result = await getIcpSwapTokenById(MOCK_CANISTER_ID_1);

			expect(fetch).toHaveBeenCalledWith(EXPECTED_ENDPOINT, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' }
			});
			expect(result).toEqual(mockToken);
		});

		it('throws when fetch response is not ok', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false
			} as Response);

			await expect(getIcpSwapTokenById(MOCK_CANISTER_ID_1)).rejects.toThrow(
				'Fetching ICPSwap failed.'
			);
		});

		it('returns null when response does not match schema', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ code: 200, message: null, data: { invalid: true } })
			} as unknown as Response);

			const result = await getIcpSwapTokenById(MOCK_CANISTER_ID_1);

			expect(result).toBeNull();
		});
	});

	describe('fetchBatchIcpSwapPrices', () => {
		it('fetches all prices and returns valid array of results', async () => {
			vi.mocked(fetch)
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockApiResponse)
				} as unknown as Response)
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockApiResponse)
				} as unknown as Response);

			const result = await fetchBatchIcpSwapPrices([MOCK_CANISTER_ID_1, MOCK_CANISTER_ID_2]);

			expect(fetch).toHaveBeenCalledTimes(2);
			expect(result).toEqual([mockToken, mockToken]);
		});

		it('excludes failed responses from result array', async () => {
			vi.mocked(fetch)
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockApiResponse)
				} as unknown as Response)
				.mockResolvedValueOnce({
					ok: false
				} as unknown as Response);

			const result = await fetchBatchIcpSwapPrices([MOCK_CANISTER_ID_1, MOCK_CANISTER_ID_2]);

			expect(fetch).toHaveBeenCalledTimes(2);
			expect(result).toHaveLength(1);
		});

		it('excludes tokens if JSON parsing fails', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => {
					throw new Error('JSON error');
				}
			} as unknown as Response);

			const result = await fetchBatchIcpSwapPrices([MOCK_CANISTER_ID_1]);

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

			const result = await fetchBatchIcpSwapPrices([MOCK_CANISTER_ID_1, MOCK_CANISTER_ID_2]);

			expect(fetch).toHaveBeenCalledTimes(2);
			expect(result).toEqual([]);
		});

		it('skips token when response schema validation fails', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ code: 200, message: null, data: null })
			} as unknown as Response);

			const result = await fetchBatchIcpSwapPrices([MOCK_CANISTER_ID_1]);

			expect(fetch).toHaveBeenCalledOnce();
			expect(result).toEqual([]);
		});
	});
});
