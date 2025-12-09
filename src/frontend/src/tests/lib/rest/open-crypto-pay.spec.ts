import { fetchOpenCryptoPay } from '$lib/rest/open-crypto-pay.rest';
import type { OpenCryptoPayResponse } from '$lib/types/open-crypto-pay';

describe('OpenCryptoPay REST client', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	global.fetch = vi.fn();

	describe('getOpenCryptoPayDetails', () => {
		const mockApiResponse: OpenCryptoPayResponse = {
			id: 'pl_test123',
			externalId: 'test-external',
			mode: 'Multiple',
			tag: 'payRequest',
			callback: 'https://api.dfx.swiss/v1/lnurlp/cb/pl_test123',
			minSendable: 1000,
			maxSendable: 10000,
			metadata: '[["text/plain", "Test"]]',
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
				amount: '10'
			},
			transferAmounts: []
		};

		it('fetches and returns a KongSwapToken successfully', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => mockApiResponse
			} as unknown as Response);

			const validUrl = 'https://app.dfx.swiss/pl/?lightning=VALID_LNURL';
			const result = await fetchOpenCryptoPay(validUrl);

			expect(fetch).toHaveBeenCalledWith(validUrl, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' }
			});

			expect(result).toEqual(mockApiResponse);
		});

		it('throws when fetch response is not ok', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false
			} as Response);

			const validUrl = 'https://app.dfx.swiss/pl/?lightning=VALID_LNURL';

			await expect(fetchOpenCryptoPay(validUrl)).rejects.toThrow('Fetching OpenCryptoPay failed.');
		});
	});
});
