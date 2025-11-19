import { processOpenCryptoPayCode } from '$lib/services/open-crypto-pay.services';
import type { OpenCryptoPayResponse } from '$lib/types/open-crypto-pay';

global.fetch = vi.fn();

vi.mock('$lib/utils/open-crypto-pay.utils', () => ({
	decodeLNURL: vi.fn((lnurl: string) => {
		if (lnurl === 'VALID_LNURL') {
			return 'https://api.dfx.swiss/v1/lnurlp/pl_test123';
		}
		return undefined;
	})
}));

describe('open-crypto-pay.service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const mockApiResponse: OpenCryptoPayResponse = {
		id: 'pl_test123',
		externalId: 'test-external',
		mode: 'Multiple',
		tag: 'payRequest',
		callback: 'https://api.dfx.swiss/v1/lnurlp/cb/pl_test123',
		minSendable: 1000,
		maxSendable: 10000,
		metadata: '[[\"text/plain\", \"Test\"]]',
		displayName: 'Test Shop',
		standard: 'OpenCryptoPay',
		possibleStandards: ['OpenCryptoPay'],
		displayQr: true,
		recipient: {
			name: 'Test Merchant',
			address: {
				street: 'Test St',
				houseNumber: '1',
				city: 'Zurich',
				zip: '8000',
				country: 'CH'
			},
			phone: '+41791234567',
			mail: 'test@example.com',
			website: 'https://example.com',
			registrationNumber: 'CHE-123.456.789',
			storeType: 'Physical',
			merchantCategory: 'Retail',
			goodsType: 'Tangible',
			goodsCategory: 'General'
		},
		route: 'Test Route',
		quote: {
			id: 'quote123',
			expiration: '2025-12-31T23:59:59.000Z',
			payment: 'payment123'
		},
		requestedAmount: {
			asset: 'CHF',
			amount: 10
		},
		transferAmounts: []
	};

	describe('processOpenCryptoPayCode', () => {
		it('should process valid OpenCryptoPay code correctly', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => mockApiResponse
			} as unknown as Response);

			const mockFetch = vi.mocked(fetch);

			const validCode = 'https://app.dfx.swiss/pl/?lightning=VALID_LNURL';
			const result = await processOpenCryptoPayCode(validCode);

			const urlString = mockFetch.mock.calls[0][0].toString();

			expect(fetch).toHaveBeenCalledOnce();
			expect(urlString).toBe('https://api.dfx.swiss/v1/lnurlp/pl_test123');
			expect(result).toEqual(mockApiResponse);
		});

		it('should throw error for empty code', async () => {
			await expect(processOpenCryptoPayCode('')).rejects.toThrow('QR Code cannot be empty');
		});

		it('should throw error for whitespace-only code', async () => {
			await expect(processOpenCryptoPayCode('   ')).rejects.toThrow('QR Code cannot be empty');
		});

		it('should throw error for invalid URL format', async () => {
			await expect(processOpenCryptoPayCode('not-a-valid-url')).rejects.toThrow();
		});

		it('should throw error for missing lightning parameter', async () => {
			const codeWithoutLightning = 'https://app.dfx.swiss/pl/?other=param';

			await expect(processOpenCryptoPayCode(codeWithoutLightning)).rejects.toThrow(
				'Missing lightning parameter'
			);
		});

		it('should throw error when LNURL decoding fails', async () => {
			const codeWithInvalidLnurl = 'https://app.dfx.swiss/pl/?lightning=INVALID_LNURL';

			await expect(processOpenCryptoPayCode(codeWithInvalidLnurl)).rejects.toThrow(
				'Failed to decode lightning parameter'
			);
		});

		it('should throw error when API request fails with 404', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 404
			} as unknown as Response);

			const mockFetch = vi.mocked(fetch);

			const validCode = 'https://app.dfx.swiss/pl/?lightning=VALID_LNURL';

			await expect(processOpenCryptoPayCode(validCode)).rejects.toThrow('API request failed: 404');

			const urlString = mockFetch.mock.calls[0][0].toString();

			expect(fetch).toHaveBeenCalledOnce();

			expect(urlString).toBe('https://api.dfx.swiss/v1/lnurlp/pl_test123');
		});

		it('should throw error when API request fails with 500', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 500
			} as unknown as Response);

			const mockFetch = vi.mocked(fetch);

			const validCode = 'https://app.dfx.swiss/pl/?lightning=VALID_LNURL';

			await expect(processOpenCryptoPayCode(validCode)).rejects.toThrow('API request failed: 500');

			const urlString = mockFetch.mock.calls[0][0].toString();

			expect(fetch).toHaveBeenCalledOnce();
			expect(urlString).toBe('https://api.dfx.swiss/v1/lnurlp/pl_test123');
		});

		it('should throw error when network request fails', async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

			const validCode = 'https://app.dfx.swiss/pl/?lightning=VALID_LNURL';

			await expect(processOpenCryptoPayCode(validCode)).rejects.toThrow('Network error');
			expect(fetch).toHaveBeenCalledOnce();
		});

		it('should throw error when JSON parsing fails', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => {
					throw new Error('Invalid JSON');
				}
			} as unknown as Response);

			const mockFetch = vi.mocked(fetch);

			const validCode = 'https://app.dfx.swiss/pl/?lightning=VALID_LNURL';

			await expect(processOpenCryptoPayCode(validCode)).rejects.toThrow('Invalid JSON');

			const urlString = mockFetch.mock.calls[0][0].toString();

			expect(fetch).toHaveBeenCalledOnce();
			expect(urlString).toBe('https://api.dfx.swiss/v1/lnurlp/pl_test123');
		});

		it('should trim whitespace from code correctly', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => mockApiResponse
			} as unknown as Response);

			const mockFetch = vi.mocked(fetch);

			const codeWithWhitespace = '  https://app.dfx.swiss/pl/?lightning=VALID_LNURL  ';
			const result = await processOpenCryptoPayCode(codeWithWhitespace);

			const urlString = mockFetch.mock.calls[0][0].toString();

			expect(fetch).toHaveBeenCalledOnce();
			expect(urlString).toBe('https://api.dfx.swiss/v1/lnurlp/pl_test123');
			expect(result).toEqual(mockApiResponse);
		});

		it('should handle URL with additional query parameters', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => mockApiResponse
			} as unknown as Response);

			const mockFetch = vi.mocked(fetch);

			const codeWithExtraParams =
				'https://app.dfx.swiss/pl/?lightning=VALID_LNURL&other=value&foo=bar';
			const result = await processOpenCryptoPayCode(codeWithExtraParams);

			const urlString = mockFetch.mock.calls[0][0].toString();

			expect(fetch).toHaveBeenCalledOnce();
			expect(urlString).toBe('https://api.dfx.swiss/v1/lnurlp/pl_test123');
			expect(result).toEqual(mockApiResponse);
		});
	});
});
