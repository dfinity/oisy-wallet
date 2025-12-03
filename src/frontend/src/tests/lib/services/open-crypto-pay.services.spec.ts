import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import * as payServices from '$eth/services/pay.services';
import type { EthFeeResult } from '$eth/types/pay';
import {
	calculateTokensWithFees,
	processOpenCryptoPayCode
} from '$lib/services/open-crypto-pay.services';
import type { OpenCryptoPayResponse, PayableToken } from '$lib/types/open-crypto-pay';

vi.mock('$lib/utils/open-crypto-pay.utils', () => ({
	decodeLNURL: vi.fn((lnurl: string) => {
		if (lnurl === 'VALID_LNURL') {
			return 'https://api.dfx.swiss/v1/lnurlp/pl_test123';
		}
	})
}));

vi.mock('$lib/rest/open-crypto-pay.rest', () => ({
	fetchOpenCryptoPay: vi.fn()
}));

vi.mock('$eth/services/pay.services', () => ({
	calculateEthFee: vi.fn()
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

	describe('processOpenCryptoPayCode', () => {
		it('should process valid OpenCryptoPay code correctly', async () => {
			const { fetchOpenCryptoPay } = await import('$lib/rest/open-crypto-pay.rest');

			vi.mocked(fetchOpenCryptoPay).mockResolvedValueOnce(mockApiResponse);

			const validCode = 'https://app.dfx.swiss/pl/?lightning=VALID_LNURL';
			const result = await processOpenCryptoPayCode(validCode);

			expect(fetchOpenCryptoPay).toHaveBeenCalledExactlyOnceWith(
				'https://api.dfx.swiss/v1/lnurlp/pl_test123'
			);
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

		it('should throw error when API request fails', async () => {
			const { fetchOpenCryptoPay } = await import('$lib/rest/open-crypto-pay.rest');

			vi.mocked(fetchOpenCryptoPay).mockRejectedValueOnce(new Error('API request failed: 404'));

			const validCode = 'https://app.dfx.swiss/pl/?lightning=VALID_LNURL';

			await expect(processOpenCryptoPayCode(validCode)).rejects.toThrow('API request failed: 404');

			expect(fetchOpenCryptoPay).toHaveBeenCalledExactlyOnceWith(
				'https://api.dfx.swiss/v1/lnurlp/pl_test123'
			);
		});

		it('should throw error when network request fails', async () => {
			const { fetchOpenCryptoPay } = await import('$lib/rest/open-crypto-pay.rest');

			vi.mocked(fetchOpenCryptoPay).mockRejectedValueOnce(new Error('Network error'));

			const validCode = 'https://app.dfx.swiss/pl/?lightning=VALID_LNURL';

			await expect(processOpenCryptoPayCode(validCode)).rejects.toThrow('Network error');
			expect(fetchOpenCryptoPay).toHaveBeenCalledOnce();
		});

		it('should trim whitespace from code correctly', async () => {
			const { fetchOpenCryptoPay } = await import('$lib/rest/open-crypto-pay.rest');

			vi.mocked(fetchOpenCryptoPay).mockResolvedValueOnce(mockApiResponse);

			const codeWithWhitespace = '  https://app.dfx.swiss/pl/?lightning=VALID_LNURL  ';
			const result = await processOpenCryptoPayCode(codeWithWhitespace);

			expect(fetchOpenCryptoPay).toHaveBeenCalledExactlyOnceWith(
				'https://api.dfx.swiss/v1/lnurlp/pl_test123'
			);
			expect(result).toEqual(mockApiResponse);
		});

		it('should handle URL with additional query parameters', async () => {
			const { fetchOpenCryptoPay } = await import('$lib/rest/open-crypto-pay.rest');

			vi.mocked(fetchOpenCryptoPay).mockResolvedValueOnce(mockApiResponse);

			const codeWithExtraParams =
				'https://app.dfx.swiss/pl/?lightning=VALID_LNURL&other=value&foo=bar';
			const result = await processOpenCryptoPayCode(codeWithExtraParams);

			expect(fetchOpenCryptoPay).toHaveBeenCalledExactlyOnceWith(
				'https://api.dfx.swiss/v1/lnurlp/pl_test123'
			);
			expect(result).toEqual(mockApiResponse);
		});
	});

	describe('calculateTokensWithFees', () => {
		const userAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

		const mockPayableToken: PayableToken = {
			...ETHEREUM_TOKEN,
			amount: '1.5',
			minFee: 0.001,
			tokenNetwork: 'Ethereum'
		};

		const mockErc20Token: PayableToken = {
			...USDC_TOKEN,
			amount: '100',
			minFee: 0.0001,
			tokenNetwork: 'Ethereum'
		};

		const mockBtcToken: PayableToken = {
			...BTC_MAINNET_TOKEN,
			amount: '0.5',
			minFee: 0.0001,
			tokenNetwork: 'Bitcoin'
		};

		const mockFeeResult: EthFeeResult = {
			feeInWei: 300000n,
			feeData: {
				maxFeePerGas: 12n,
				maxPriorityFeePerGas: 7n
			},
			estimatedGasLimit: 25000n
		};

		beforeEach(() => {
			vi.clearAllMocks();
			vi.mocked(payServices.calculateEthFee).mockResolvedValue(mockFeeResult);
		});

		it('should return empty array for empty tokens array', async () => {
			const result = await calculateTokensWithFees({
				tokens: [],
				userAddress
			});

			expect(result).toEqual([]);
			expect(payServices.calculateEthFee).not.toHaveBeenCalled();
		});

		it('should calculate fee for single native ETH token', async () => {
			const result = await calculateTokensWithFees({
				tokens: [mockPayableToken],
				userAddress
			});

			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({
				...mockPayableToken,
				fee: mockFeeResult
			});
			expect(payServices.calculateEthFee).toHaveBeenCalledWith({
				userAddress,
				token: mockPayableToken
			});
		});

		it('should calculate fee for ERC20 token', async () => {
			const result = await calculateTokensWithFees({
				tokens: [mockErc20Token],
				userAddress
			});

			expect(result).toHaveLength(1);
			expect(result[0].fee).toBeDefined();
			expect(payServices.calculateEthFee).toHaveBeenCalledWith({
				userAddress,
				token: mockErc20Token
			});
		});

		it('should skip non-Ethereum tokens', async () => {
			const result = await calculateTokensWithFees({
				tokens: [mockBtcToken],
				userAddress
			});

			expect(result).toHaveLength(1);
			expect(result[0].fee).toBeUndefined();
			expect(payServices.calculateEthFee).not.toHaveBeenCalled();
		});

		it('should handle mixed tokens (ETH, ERC20, Bitcoin)', async () => {
			const tokens = [mockPayableToken, mockErc20Token, mockBtcToken];

			const result = await calculateTokensWithFees({
				tokens,
				userAddress
			});

			expect(result).toHaveLength(3);
			expect(result[0].fee).toBeDefined();
			expect(result[1].fee).toBeDefined();
			expect(result[2].fee).toBeUndefined();
			expect(payServices.calculateEthFee).toHaveBeenCalledTimes(2);
		});

		it('should return token without fee when calculateEthFee returns undefined', async () => {
			vi.mocked(payServices.calculateEthFee).mockResolvedValue(undefined);

			const result = await calculateTokensWithFees({
				tokens: [mockPayableToken],
				userAddress
			});

			expect(result).toHaveLength(1);
			expect(result[0].fee).toBeUndefined();
		});

		it('should handle errors gracefully and exclude failed tokens', async () => {
			vi.mocked(payServices.calculateEthFee).mockRejectedValue(new Error('Network error'));

			const result = await calculateTokensWithFees({
				tokens: [mockPayableToken],
				userAddress
			});

			expect(result).toHaveLength(0);
		});

		it('should process all tokens even if some fail', async () => {
			vi.mocked(payServices.calculateEthFee)
				.mockRejectedValueOnce(new Error('Network error'))
				.mockResolvedValueOnce(mockFeeResult);

			const tokens = [
				mockPayableToken,
				{ ...mockPayableToken, id: 'token-2', symbol: 'ETH2' }
			] as unknown as PayableToken[];

			const result = await calculateTokensWithFees({
				tokens,
				userAddress
			});

			expect(result).toHaveLength(1);
			expect(result[0].fee).toBeDefined();
		});
	});
});
