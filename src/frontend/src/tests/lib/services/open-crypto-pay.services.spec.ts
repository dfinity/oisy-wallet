import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ETH_BASE_FEE } from '$eth/constants/eth.constants';
import type { InfuraProvider } from '$eth/providers/infura.providers';
import * as feeServices from '$eth/services/fee.services';
import { ZERO } from '$lib/constants/app.constants';
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
		const network = ETHEREUM_NETWORK;
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
			tokenNetwork: 'Ethereum',
			standard: 'erc20'
		} as unknown as PayableToken;

		const mockBtcToken: PayableToken = {
			...BTC_MAINNET_TOKEN,
			amount: '0.5',
			minFee: 0.0001,
			tokenNetwork: 'Bitcoin'
		} as unknown as PayableToken;

		const createMockFeeDataResponse = () => ({
			feeData: {
				gasPrice: null,
				maxFeePerGas: 12n,
				maxPriorityFeePerGas: 7n
			},
			provider: {
				safeEstimateGas: vi.fn().mockResolvedValue(25n),
				estimateGas: vi.fn().mockResolvedValue(25n),
				getFeeData: vi.fn()
			} as unknown as InfuraProvider,
			params: {
				from: userAddress,
				to: userAddress
			}
		});

		beforeEach(() => {
			vi.clearAllMocks();

			// Створюємо новий mock response для кожного тесту
			const mockResponse = createMockFeeDataResponse();
			vi.spyOn(feeServices, 'getEthFeeDataWithProvider').mockResolvedValue(mockResponse);
			vi.spyOn(feeServices, 'getErc20FeeData').mockResolvedValue(30n);
		});

		it('should return empty array for empty tokens array', async () => {
			const result = await calculateTokensWithFees({
				tokens: [],
				userAddress
			});

			expect(result).toEqual([]);
		});

		it('should calculate fee for single native ETH token', async () => {
			const mockResponse = createMockFeeDataResponse();

			const result = await calculateTokensWithFees({
				tokens: [mockPayableToken],
				userAddress
			});

			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({
				...mockPayableToken,
				fee: {
					feeInWei: expect.any(BigInt),
					feeData: mockResponse.feeData,
					estimatedGasLimit: expect.any(BigInt)
				}
			});
		});

		it('should calculate fee for native ETH using ETH_BASE_FEE when estimatedGas is lower', async () => {
			const mockResponse = createMockFeeDataResponse();

			vi.mocked(mockResponse.provider.safeEstimateGas).mockResolvedValue(10n);

			const result = await calculateTokensWithFees({
				tokens: [mockPayableToken],
				userAddress
			});

			expect(result[0].fee?.estimatedGasLimit).toBe(ETH_BASE_FEE);
		});

		it('should calculate fee for ERC20 token', async () => {
			vi.spyOn(feeServices, 'getErc20FeeData').mockResolvedValue(40n);

			const result = await calculateTokensWithFees({
				tokens: [mockErc20Token],
				userAddress
			});

			expect(result).toHaveLength(1);
			expect(result[0].fee?.estimatedGasLimit).toBe(40n);
			expect(feeServices.getErc20FeeData).toHaveBeenCalledWith(
				expect.objectContaining({
					contract: mockErc20Token,
					targetNetwork: network
				})
			);
		});

		it('should skip non-Ethereum tokens', async () => {
			const result = await calculateTokensWithFees({
				tokens: [mockBtcToken],
				userAddress
			});

			expect(result).toHaveLength(1);
			expect(result[0].fee).toBeUndefined();
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
		});

		it('should return token without fee when userAddress is null', async () => {
			const result = await calculateTokensWithFees({
				tokens: [mockPayableToken],
				userAddress: null as unknown as string
			});

			expect(result).toHaveLength(1);
			expect(result[0].fee).toBeUndefined();
		});

		it('should return token without fee when maxFeePerGas is null', async () => {
			const mockResponse = createMockFeeDataResponse();

			vi.spyOn(feeServices, 'getEthFeeDataWithProvider').mockResolvedValue({
				...mockResponse,
				feeData: {
					...mockResponse.feeData,
					maxFeePerGas: null as unknown as bigint
				}
			});

			const result = await calculateTokensWithFees({
				tokens: [mockPayableToken],
				userAddress
			});

			expect(result).toHaveLength(1);
			expect(result[0].fee).toBeUndefined();
		});

		it('should return token without fee when estimatedGasLimit is null', async () => {
			const mockResponse = createMockFeeDataResponse();

			vi.mocked(mockResponse.provider.safeEstimateGas).mockResolvedValue(null as unknown as bigint);

			const result = await calculateTokensWithFees({
				tokens: [mockPayableToken],
				userAddress
			});

			expect(result).toHaveLength(1);
			expect(result[0].fee).toBeUndefined();
		});

		it('should return token without fee when gasPrice is ZERO', async () => {
			const mockResponse = createMockFeeDataResponse();

			vi.spyOn(feeServices, 'getEthFeeDataWithProvider').mockResolvedValue({
				...mockResponse,
				feeData: {
					...mockResponse.feeData,
					maxFeePerGas: ZERO
				}
			});

			const result = await calculateTokensWithFees({
				tokens: [mockPayableToken],
				userAddress
			});

			expect(result).toHaveLength(1);
			expect(result[0].fee).toBeUndefined();
		});

		it('should calculate feeInWei correctly', async () => {
			const maxFeePerGas = 12n;
			const estimatedGasLimit = 25n;
			const expectedFeeInWei = maxFeePerGas * estimatedGasLimit;

			const result = await calculateTokensWithFees({
				tokens: [mockPayableToken],
				userAddress
			});

			expect(result[0].fee?.feeInWei).toBe(expectedFeeInWei);
		});

		it('should use token.minFee if higher than maxFeePerGas', async () => {
			const mockResponse = createMockFeeDataResponse();

			const tokenWithHighMinFee = {
				...mockPayableToken,
				minFee: 1000
			};

			vi.spyOn(feeServices, 'getEthFeeDataWithProvider').mockResolvedValue({
				...mockResponse,
				feeData: {
					...mockResponse.feeData,
					maxFeePerGas: 1n
				}
			});

			const result = await calculateTokensWithFees({
				tokens: [tokenWithHighMinFee],
				userAddress
			});

			const gasPrice = BigInt(tokenWithHighMinFee.minFee);
			const expectedFeeInWei = gasPrice * 25n;

			expect(result[0].fee?.feeInWei).toBe(expectedFeeInWei);
		});

		it('should handle errors gracefully and log warning', async () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			vi.spyOn(feeServices, 'getEthFeeDataWithProvider').mockRejectedValue(
				new Error('Network error')
			);

			const result = await calculateTokensWithFees({
				tokens: [mockPayableToken],
				userAddress
			});

			expect(result).toHaveLength(1);
			expect(result[0].fee).toBeUndefined();
			expect(consoleWarnSpy).toHaveBeenCalledWith(
				expect.stringContaining('Failed to calculate fee'),
				expect.any(Error)
			);

			consoleWarnSpy.mockRestore();
		});

		it('should process all tokens even if some fail', async () => {
			const mockResponse = createMockFeeDataResponse();

			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			vi.spyOn(feeServices, 'getEthFeeDataWithProvider')
				.mockRejectedValueOnce(new Error('Network error'))
				.mockResolvedValueOnce(mockResponse);

			const tokens = [
				mockPayableToken,
				{ ...mockPayableToken, id: 'token-2', symbol: 'ETH2' }
			] as unknown as PayableToken[];

			const result = await calculateTokensWithFees({
				tokens,
				userAddress
			});

			expect(result).toHaveLength(2);
			expect(result[0].fee).toBeUndefined();
			expect(result[1].fee).toBeDefined();

			consoleWarnSpy.mockRestore();
		});
	});
});
