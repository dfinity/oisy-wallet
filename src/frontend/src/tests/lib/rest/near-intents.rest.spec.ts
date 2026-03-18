import {
	fetchNearIntentsQuote,
	fetchNearIntentsStatus,
	fetchNearIntentsTokens,
	submitNearIntentsDeposit
} from '$lib/rest/near-intents.rest';
import {
	mockNearIntentsQuoteResponse,
	mockNearIntentsStatusSuccess,
	mockNearIntentsTokens
} from '$tests/mocks/near-intents.mock';

vi.mock('$env/rest/near-intents.env', () => ({
	NEAR_INTENTS_API_URL: 'https://1click.chaindefuser.com/v0'
}));

describe('near-intents.rest', () => {
	global.fetch = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('fetchNearIntentsTokens', () => {
		it('fetches and returns the token list', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockNearIntentsTokens)
			} as unknown as Response);

			const result = await fetchNearIntentsTokens();

			expect(fetch).toHaveBeenCalledWith('https://1click.chaindefuser.com/v0/tokens');
			expect(result).toEqual(mockNearIntentsTokens);
		});

		it('throws when response is not ok', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				statusText: 'Internal Server Error'
			} as Response);

			await expect(fetchNearIntentsTokens()).rejects.toThrow(
				'Failed to fetch NEAR Intents tokens: Internal Server Error'
			);
		});
	});

	describe('fetchNearIntentsQuote', () => {
		const quoteRequest = {
			dry: false,
			swapType: 'EXACT_INPUT' as const,
			slippageTolerance: 100,
			originAsset: 'nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near',
			depositType: 'ORIGIN_CHAIN' as const,
			destinationAsset: 'nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near',
			amount: '1000000',
			recipient: '0xUser',
			recipientType: 'DESTINATION_CHAIN' as const,
			refundTo: '0xUser',
			refundType: 'ORIGIN_CHAIN' as const,
			deadline: '2026-03-16T00:10:00.000Z'
		};

		it('sends a POST request and returns the quote', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockNearIntentsQuoteResponse)
			} as unknown as Response);

			const result = await fetchNearIntentsQuote(quoteRequest);

			expect(fetch).toHaveBeenCalledWith('https://1click.chaindefuser.com/v0/quote', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(quoteRequest)
			});
			expect(result).toEqual(mockNearIntentsQuoteResponse);
		});

		it('throws with API error message when response is not ok', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				statusText: 'Bad Request',
				json: () => Promise.resolve({ message: 'Invalid origin asset' })
			} as unknown as Response);

			await expect(fetchNearIntentsQuote(quoteRequest)).rejects.toThrowError(
				'NEAR Intents quote failed: Invalid origin asset'
			);
		});

		it('throws with statusText when error json parsing fails', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				statusText: 'Bad Request',
				json: () => Promise.reject(new Error('parse error'))
			} as unknown as Response);

			await expect(fetchNearIntentsQuote(quoteRequest)).rejects.toThrowError(
				'NEAR Intents quote failed: Bad Request'
			);
		});
	});

	describe('fetchNearIntentsStatus', () => {
		it('fetches status with deposit address', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockNearIntentsStatusSuccess)
			} as unknown as Response);

			const result = await fetchNearIntentsStatus({
				depositAddress: '0xDeposit123'
			});

			expect(fetch).toHaveBeenCalledWith(
				'https://1click.chaindefuser.com/v0/status?depositAddress=0xDeposit123',
				{
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
			expect(result).toEqual(mockNearIntentsStatusSuccess);
		});

		it('includes depositMemo in query params when provided', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockNearIntentsStatusSuccess)
			} as unknown as Response);

			await fetchNearIntentsStatus({
				depositAddress: '0xDeposit123',
				depositMemo: 'memo456'
			});

			expect(fetch).toHaveBeenCalledWith(
				'https://1click.chaindefuser.com/v0/status?depositAddress=0xDeposit123&depositMemo=memo456',
				expect.any(Object)
			);
		});

		it('throws when response is not ok', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				statusText: 'Not Found'
			} as Response);

			await expect(fetchNearIntentsStatus({ depositAddress: '0xInvalid' })).rejects.toThrowError(
				'NEAR Intents status check failed: Not Found'
			);
		});
	});

	describe('submitNearIntentsDeposit', () => {
		it('sends a POST request with tx hash and deposit address', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockNearIntentsStatusSuccess)
			} as unknown as Response);

			const request = {
				txHash: '0xTxHash123',
				depositAddress: '0xDeposit123'
			};

			const result = await submitNearIntentsDeposit(request);

			expect(fetch).toHaveBeenCalledWith('https://1click.chaindefuser.com/v0/deposit/submit', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(request)
			});
			expect(result).toEqual(mockNearIntentsStatusSuccess);
		});

		it('throws when response is not ok', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				statusText: 'Bad Request'
			} as Response);

			await expect(
				submitNearIntentsDeposit({
					txHash: '0xTxHash',
					depositAddress: '0xDeposit'
				})
			).rejects.toThrowError('NEAR Intents deposit submit failed: Bad Request');
		});
	});
});
