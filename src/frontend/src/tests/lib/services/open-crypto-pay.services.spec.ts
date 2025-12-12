import type { EthSignTransactionRequest } from '$declarations/signer/signer.did';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import type { InfuraErc20Provider } from '$eth/providers/infura-erc20.providers';
import * as infuraErc20ProvidersLib from '$eth/providers/infura-erc20.providers';
import { getNonce } from '$eth/services/nonce.services';
import * as payServices from '$eth/services/pay.services';
import * as sendServicesLib from '$eth/services/send.services';
import { ethPrepareTransaction } from '$eth/services/send.services';
import type { EthAddress } from '$eth/types/address';
import type { EthFeeResult } from '$eth/types/pay';
import { signTransaction } from '$lib/api/signer.api';
import { ZERO } from '$lib/constants/app.constants';
import { ProgressStepsPayment } from '$lib/enums/progress-steps';
import { fetchOpenCryptoPay } from '$lib/rest/open-crypto-pay.rest';
import {
	buildTransactionBaseParams,
	calculateTokensWithFees,
	pay,
	prepareErc20Transaction,
	processOpenCryptoPayCode
} from '$lib/services/open-crypto-pay.services';
import type {
	OpenCryptoPayResponse,
	PayableToken,
	PayableTokenWithConvertedAmount,
	TransactionBaseParams,
	ValidatedDFXPaymentData
} from '$lib/types/open-crypto-pay';
import { extractQuoteData } from '$lib/utils/open-crypto-pay.utils';
import { decodeQrCodeUrn } from '$lib/utils/qr-code.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';

vi.mock('$lib/utils/open-crypto-pay.utils', () => ({
	decodeLNURL: vi.fn((lnurl: string) => {
		if (lnurl === 'VALID_LNURL') {
			return 'https://api.dfx.swiss/v1/lnurlp/pl_test123';
		}
	}),
	extractQuoteData: vi.fn(() => ({
		quoteId: 'mock-quote-id-123',
		callback: 'https://api.dfx.swiss/v1/lnurlp/cb/pl_test123'
	})),
	validateDecodedData: vi.fn(({ decodedData, fee }) => ({
		destination: decodedData?.destination ?? '',
		ethereumChainId: decodedData?.ethereumChainId ?? '1',
		value: decodedData?.value ?? 0,
		feeData: fee?.feeData ?? {
			maxFeePerGas: 12n,
			maxPriorityFeePerGas: 7n
		},
		estimatedGasLimit: fee?.estimatedGasLimit ?? 25000n
	}))
}));

vi.mock('$lib/rest/open-crypto-pay.rest', () => ({
	fetchOpenCryptoPay: vi.fn()
}));

vi.mock('$eth/services/pay.services', () => ({
	calculateEthFee: vi.fn()
}));

vi.mock('$lib/api/signer.api', () => ({
	signTransaction: vi.fn()
}));

vi.mock('$lib/utils/qr-code.utils', () => ({
	decodeQrCodeUrn: vi.fn()
}));

vi.mock('$eth/services/nonce.services', () => ({
	getNonce: vi.fn()
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
			await expect(processOpenCryptoPayCode('')).rejects.toThrowError('QR Code cannot be empty');
		});

		it('should throw error for whitespace-only code', async () => {
			await expect(processOpenCryptoPayCode('   ')).rejects.toThrowError('QR Code cannot be empty');
		});

		it('should throw error for invalid URL format', async () => {
			await expect(processOpenCryptoPayCode('not-a-valid-url')).rejects.toThrowError();
		});

		it('should throw error for missing lightning parameter', async () => {
			const codeWithoutLightning = 'https://app.dfx.swiss/pl/?other=param';

			await expect(processOpenCryptoPayCode(codeWithoutLightning)).rejects.toThrowError(
				'Missing lightning parameter'
			);
		});

		it('should throw error when LNURL decoding fails', async () => {
			const codeWithInvalidLnurl = 'https://app.dfx.swiss/pl/?lightning=INVALID_LNURL';

			await expect(processOpenCryptoPayCode(codeWithInvalidLnurl)).rejects.toThrowError(
				'Failed to decode lightning parameter'
			);
		});

		it('should throw error when API request fails', async () => {
			const { fetchOpenCryptoPay } = await import('$lib/rest/open-crypto-pay.rest');

			vi.mocked(fetchOpenCryptoPay).mockRejectedValueOnce(new Error('API request failed: 404'));

			const validCode = 'https://app.dfx.swiss/pl/?lightning=VALID_LNURL';

			await expect(processOpenCryptoPayCode(validCode)).rejects.toThrowError(
				'API request failed: 404'
			);

			expect(fetchOpenCryptoPay).toHaveBeenCalledExactlyOnceWith(
				'https://api.dfx.swiss/v1/lnurlp/pl_test123'
			);
		});

		it('should throw error when network request fails', async () => {
			const { fetchOpenCryptoPay } = await import('$lib/rest/open-crypto-pay.rest');

			vi.mocked(fetchOpenCryptoPay).mockRejectedValueOnce(new Error('Network error'));

			const validCode = 'https://app.dfx.swiss/pl/?lightning=VALID_LNURL';

			await expect(processOpenCryptoPayCode(validCode)).rejects.toThrowError('Network error');
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

	describe('buildTransactionBaseParams', () => {
		const userAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as EthAddress;

		const validatedData: ValidatedDFXPaymentData = {
			destination: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
			ethereumChainId: 1n,
			value: 1000000000000n,
			feeData: {
				maxFeePerGas: 12n,
				maxPriorityFeePerGas: 7n
			},
			estimatedGasLimit: 25000n
		};

		it('should build transaction params with correct structure', () => {
			const result = buildTransactionBaseParams({
				from: userAddress,
				nonce: 5,
				validatedData
			});

			expect(result).toEqual({
				from: userAddress,
				to: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
				amount: 1000000000000n,
				maxPriorityFeePerGas: 7n,
				maxFeePerGas: 12n,
				nonce: 5,
				gas: 25000n,
				chainId: 1n
			});
		});

		it('should convert string value to BigInt', () => {
			const result = buildTransactionBaseParams({
				from: userAddress,
				nonce: 0,
				validatedData
			});

			expect(result.amount).toBe(1000000000000n);
			expect(typeof result.amount).toBe('bigint');
		});

		it('should convert string chainId to BigInt', () => {
			const result = buildTransactionBaseParams({
				from: userAddress,
				nonce: 0,
				validatedData
			});

			expect(result.chainId).toBe(1n);
			expect(typeof result.chainId).toBe('bigint');
		});

		it('should handle different nonce values', () => {
			const nonces = [0, 1, 5, 100, 999];

			nonces.forEach((nonce) => {
				const result = buildTransactionBaseParams({
					from: userAddress,
					nonce,
					validatedData
				});

				expect(result.nonce).toBe(nonce);
			});
		});

		it('should handle different from addresses', () => {
			const addresses = [
				'0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
				'0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
				'0xcccccccccccccccccccccccccccccccccccccccc'
			];

			addresses.forEach((address) => {
				const result = buildTransactionBaseParams({
					from: address,
					nonce: 0,
					validatedData
				});

				expect(result.from).toBe(address);
			});
		});

		it('should handle different destination addresses', () => {
			const data = {
				...validatedData,
				destination: '0xdddddddddddddddddddddddddddddddddddddddd'
			};

			const result = buildTransactionBaseParams({
				from: userAddress,
				nonce: 0,
				validatedData: data
			});

			expect(result.to).toBe('0xdddddddddddddddddddddddddddddddddddddddd');
		});

		it('should handle different chain IDs', () => {
			const chainIds = [1n, 137n, 56n, 42161n];

			chainIds.forEach((chainId) => {
				const data = { ...validatedData, ethereumChainId: chainId };

				const result = buildTransactionBaseParams({
					from: userAddress,
					nonce: 0,
					validatedData: data
				});

				expect(result.chainId).toBe(chainId);
			});
		});

		it('should handle zero value', () => {
			const data = { ...validatedData, value: ZERO };

			const result = buildTransactionBaseParams({
				from: userAddress,
				nonce: 0,
				validatedData: data
			});

			expect(result.amount).toBe(ZERO);
		});

		it('should preserve BigInt fee values', () => {
			const data: ValidatedDFXPaymentData = {
				...validatedData,
				feeData: {
					maxFeePerGas: 999n,
					maxPriorityFeePerGas: 888n
				}
			};

			const result = buildTransactionBaseParams({
				from: userAddress,
				nonce: 0,
				validatedData: data
			});

			expect(result.maxFeePerGas).toBe(999n);
			expect(result.maxPriorityFeePerGas).toBe(888n);
			expect(typeof result.maxFeePerGas).toBe('bigint');
			expect(typeof result.maxPriorityFeePerGas).toBe('bigint');
		});

		it('should preserve BigInt gas limit', () => {
			const data: ValidatedDFXPaymentData = {
				...validatedData,
				estimatedGasLimit: 50000n
			};

			const result = buildTransactionBaseParams({
				from: userAddress,
				nonce: 0,
				validatedData: data
			});

			expect(result.gas).toBe(50000n);
			expect(typeof result.gas).toBe('bigint');
		});
	});

	describe('prepareEthTransaction', () => {
		const baseParams = {
			to: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
			from: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbaaa',
			amount: 1000000000000000000n,
			maxPriorityFeePerGas: 7n,
			maxFeePerGas: 12n,
			nonce: 5,
			gas: 25000n,
			chainId: 1n
		};

		it('should prepare transaction with all required fields', () => {
			const result = ethPrepareTransaction(baseParams);

			expect(result).toEqual({
				to: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
				value: 1000000000000000000n,
				chain_id: 1n,
				nonce: 5n,
				gas: 25000n,
				max_fee_per_gas: 12n,
				max_priority_fee_per_gas: 7n,
				data: []
			});
		});
	});

	describe('prepareErc20Transaction', () => {
		const baseParams: TransactionBaseParams = {
			from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as EthAddress,
			to: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
			amount: 1000000000000000000n,
			maxPriorityFeePerGas: 7n,
			maxFeePerGas: 12n,
			nonce: 5,
			gas: 25000n,
			chainId: 1n
		};

		const mockToken: PayableTokenWithConvertedAmount = {
			...USDC_TOKEN,
			amount: '100',
			minFee: 0.0001,
			tokenNetwork: 'Ethereum',
			amountInUSD: 100,
			feeInUSD: 10,
			sumInUSD: 110,
			fee: {
				feeInWei: 300000n,
				feeData: {
					maxFeePerGas: 12n,
					maxPriorityFeePerGas: 7n
				},
				estimatedGasLimit: 25000n
			}
		} as PayableTokenWithConvertedAmount;

		const populateTransactionSpy = vi.fn();
		const erc20PrepareTransactionSpy = vi.fn();

		const mockErc20Provider = {
			populateTransaction: populateTransactionSpy
		} as unknown as InfuraErc20Provider;

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(infuraErc20ProvidersLib, 'infuraErc20Providers').mockReturnValue(mockErc20Provider);
			vi.spyOn(sendServicesLib, 'erc20PrepareTransaction').mockImplementation(
				erc20PrepareTransactionSpy
			);

			erc20PrepareTransactionSpy.mockResolvedValue({} as EthSignTransactionRequest);
		});

		it('should call erc20PrepareTransaction with correct params', async () => {
			const mockTransaction = {
				type: 'erc20-transaction'
			} as unknown as EthSignTransactionRequest;

			erc20PrepareTransactionSpy.mockResolvedValue(mockTransaction);

			const result = await prepareErc20Transaction({
				baseParams,
				token: mockToken
			});

			expect(erc20PrepareTransactionSpy).toHaveBeenCalledWith({
				...baseParams,
				token: mockToken,
				populate: populateTransactionSpy
			});
			expect(result).toEqual(mockTransaction);
		});

		it('should get populate function from correct network', async () => {
			await prepareErc20Transaction({
				baseParams,
				token: mockToken
			});

			expect(infuraErc20ProvidersLib.infuraErc20Providers).toHaveBeenCalledWith(
				mockToken.network.id
			);
		});

		it('should call erc20PrepareTransaction exactly once', async () => {
			await prepareErc20Transaction({
				baseParams,
				token: mockToken
			});

			expect(erc20PrepareTransactionSpy).toHaveBeenCalledOnce();
		});

		it('should return transaction from erc20PrepareTransaction', async () => {
			const expectedTransaction = {
				to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
				value: ZERO,
				data: '0xa9059cbb...',
				nonce: baseParams.nonce
			} as unknown as EthSignTransactionRequest;

			erc20PrepareTransactionSpy.mockResolvedValue(expectedTransaction);

			const result = await prepareErc20Transaction({
				baseParams,
				token: mockToken
			});

			expect(result).toEqual(expectedTransaction);
		});

		it('should handle different base params', async () => {
			const differentParams: TransactionBaseParams = {
				...baseParams,
				amount: 2000000000n,
				nonce: 15
			};

			await prepareErc20Transaction({
				baseParams: differentParams,
				token: mockToken
			});

			expect(erc20PrepareTransactionSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					amount: 2000000000n,
					nonce: 15
				})
			);
		});

		it('should handle erc20PrepareTransaction returning complex transaction', async () => {
			const complexTransaction = {
				to: 'test-address',
				value: ZERO,
				data: '0xa9059cbb00000000000000000000000000000000000000000000000000000000000000640000000000000000000000000000000000000000000000000de0b6b3a7640000',
				nonce: baseParams.nonce,
				gasLimit: baseParams.gas,
				maxFeePerGas: baseParams.maxFeePerGas,
				maxPriorityFeePerGas: baseParams.maxPriorityFeePerGas,
				chainId: baseParams.chainId,
				type: 2
			} as unknown as EthSignTransactionRequest;

			erc20PrepareTransactionSpy.mockResolvedValue(complexTransaction);

			const result = await prepareErc20Transaction({
				baseParams,
				token: mockToken
			});

			expect(result).toEqual(complexTransaction);
		});

		it('should propagate errors from erc20PrepareTransaction', async () => {
			const error = new Error('Failed to prepare transaction');
			erc20PrepareTransactionSpy.mockRejectedValue(error);

			await expect(
				prepareErc20Transaction({
					baseParams,
					token: mockToken
				})
			).rejects.toThrowError('Failed to prepare transaction');
		});
	});

	describe('pay', () => {
		const mockToken: PayableTokenWithConvertedAmount = {
			...ETHEREUM_TOKEN,
			amount: '1.0',
			minFee: 0.001,
			tokenNetwork: 'Ethereum',
			amountInUSD: 100,
			feeInUSD: 10,
			sumInUSD: 110,
			fee: {
				feeInWei: 300000n,
				feeData: {
					maxFeePerGas: 12n,
					maxPriorityFeePerGas: 7n
				},
				estimatedGasLimit: 25000n
			}
		};

		const mockData: OpenCryptoPayResponse = {
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
			requestedAmount: {
				asset: 'CHF',
				amount: '10'
			},
			transferAmounts: []
		};

		const from = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as EthAddress;
		const mockRawTransaction = '0x02f8...';
		const mockProgress = vi.fn();

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should complete payment flow successfully', async () => {
			vi.mocked(extractQuoteData).mockReturnValue({
				quoteId: 'mock-quote-id-123',
				callback: 'https://api.dfx.swiss/v1/lnurlp/cb/pl_test123'
			});

			vi.mocked(fetchOpenCryptoPay).mockResolvedValueOnce({
				uri: 'ethereum:0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb?value=1000000000000'
			});

			vi.mocked(decodeQrCodeUrn).mockReturnValue({
				prefix: 'ethereum',
				destination: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
				value: 1000000000000,
				ethereumChainId: '1'
			});

			vi.mocked(getNonce).mockResolvedValue(5);
			vi.mocked(signTransaction).mockResolvedValue(mockRawTransaction);
			vi.mocked(fetchOpenCryptoPay).mockResolvedValueOnce(undefined);

			await pay({
				token: mockToken,
				data: mockData,
				from,
				identity: mockIdentity,
				progress: mockProgress
			});

			expect(extractQuoteData).toHaveBeenCalledExactlyOnceWith(mockData);
			expect(signTransaction).toHaveBeenCalledOnce();
			expect(mockProgress).toHaveBeenCalled();
			expect(mockProgress).toHaveBeenNthCalledWith(1, ProgressStepsPayment.CREATE_TRANSACTION);
			expect(mockProgress).toHaveBeenNthCalledWith(2, ProgressStepsPayment.SIGN_TRANSACTION);
			expect(mockProgress).toHaveBeenNthCalledWith(3, ProgressStepsPayment.PAY);
		});

		it('should call extractQuoteData with correct data', async () => {
			vi.mocked(extractQuoteData).mockReturnValue({
				quoteId: 'test-quote',
				callback: 'https://api.dfx.swiss/v1/lnurlp/cb/test'
			});

			vi.mocked(fetchOpenCryptoPay).mockResolvedValueOnce({
				uri: 'ethereum:0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb?value=1000000000000'
			});

			vi.mocked(decodeQrCodeUrn).mockReturnValue({
				prefix: 'ethereum',
				destination: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
				value: 1000000000000,
				ethereumChainId: '1'
			});

			vi.mocked(getNonce).mockResolvedValue(5);
			vi.mocked(signTransaction).mockResolvedValue(mockRawTransaction);
			vi.mocked(fetchOpenCryptoPay).mockResolvedValueOnce(undefined);

			await pay({
				token: mockToken,
				data: mockData,
				from,
				identity: mockIdentity,
				progress: mockProgress
			});

			expect(extractQuoteData).toHaveBeenCalledWith(mockData);
		});

		it('should prepare payment transaction with correct parameters', async () => {
			vi.mocked(extractQuoteData).mockReturnValue({
				quoteId: 'quote-123',
				callback: 'https://api.dfx.swiss/v1/lnurlp/cb/pl_test'
			});

			vi.mocked(fetchOpenCryptoPay).mockResolvedValueOnce({
				uri: 'ethereum:0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb?value=1000000000000'
			});

			vi.mocked(decodeQrCodeUrn).mockReturnValue({
				prefix: 'ethereum',
				destination: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
				value: 1000000000000,
				ethereumChainId: '1'
			});

			vi.mocked(getNonce).mockResolvedValue(5);
			vi.mocked(signTransaction).mockResolvedValue(mockRawTransaction);
			vi.mocked(fetchOpenCryptoPay).mockResolvedValueOnce(undefined);

			await pay({
				token: mockToken,
				data: mockData,
				from,
				identity: mockIdentity,
				progress: mockProgress
			});

			expect(fetchOpenCryptoPay).toHaveBeenCalledWith(
				'https://api.dfx.swiss/v1/lnurlp/cb/pl_test?quote=quote-123&method=Ethereum&asset=ETH'
			);
		});

		it('should sign transaction with correct identity', async () => {
			vi.mocked(extractQuoteData).mockReturnValue({
				quoteId: 'quote-123',
				callback: 'https://api.dfx.swiss/v1/lnurlp/cb/pl_test'
			});

			vi.mocked(fetchOpenCryptoPay).mockResolvedValueOnce({
				uri: 'ethereum:0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb?value=1000000000000'
			});

			vi.mocked(decodeQrCodeUrn).mockReturnValue({
				prefix: 'ethereum',
				destination: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
				value: 1000000000000,
				ethereumChainId: '1'
			});

			vi.mocked(getNonce).mockResolvedValue(5);
			vi.mocked(signTransaction).mockResolvedValue(mockRawTransaction);
			vi.mocked(fetchOpenCryptoPay).mockResolvedValueOnce(undefined);

			await pay({
				token: mockToken,
				data: mockData,
				from,
				identity: mockIdentity,
				progress: mockProgress
			});

			expect(signTransaction).toHaveBeenCalledWith(
				expect.objectContaining({
					identity: mockIdentity
				})
			);
		});

		it('should submit transaction with correct payment URI', async () => {
			vi.mocked(extractQuoteData).mockReturnValue({
				quoteId: 'quote-123',
				callback: 'https://api.dfx.swiss/v1/lnurlp/cb/pl_test'
			});

			vi.mocked(fetchOpenCryptoPay).mockResolvedValueOnce({
				uri: 'ethereum:0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb?value=1000000000000'
			});

			vi.mocked(decodeQrCodeUrn).mockReturnValue({
				prefix: 'ethereum',
				destination: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
				value: 1000000000000,
				ethereumChainId: '1'
			});

			vi.mocked(getNonce).mockResolvedValue(5);
			vi.mocked(signTransaction).mockResolvedValue(mockRawTransaction);
			vi.mocked(fetchOpenCryptoPay).mockResolvedValueOnce(undefined);

			await pay({
				token: mockToken,
				data: mockData,
				from,
				identity: mockIdentity,
				progress: mockProgress
			});

			expect(fetchOpenCryptoPay).toHaveBeenNthCalledWith(
				2,
				'https://api.dfx.swiss/v1/lnurlp/tx/pl_test?quote=quote-123&method=Ethereum&hex=0x02f8...'
			);
		});

		it('should handle payment preparation errors', async () => {
			vi.mocked(extractQuoteData).mockReturnValue({
				quoteId: 'quote-123',
				callback: 'https://api.dfx.swiss/v1/lnurlp/cb/pl_test'
			});

			vi.mocked(fetchOpenCryptoPay).mockRejectedValue(new Error('Payment failed'));

			await expect(
				pay({
					token: mockToken,
					data: mockData,
					from,
					identity: mockIdentity,
					progress: mockProgress
				})
			).rejects.toThrowError('Payment failed');
		});

		it('should handle transaction signing errors', async () => {
			vi.mocked(extractQuoteData).mockReturnValue({
				quoteId: 'quote-123',
				callback: 'https://api.dfx.swiss/v1/lnurlp/cb/pl_test'
			});

			vi.mocked(fetchOpenCryptoPay).mockResolvedValueOnce({
				uri: 'ethereum:0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb?value=1000000000000'
			});

			vi.mocked(decodeQrCodeUrn).mockReturnValue({
				prefix: 'ethereum',
				destination: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
				value: 1000000000000,
				ethereumChainId: '1'
			});

			vi.mocked(getNonce).mockResolvedValue(5);
			vi.mocked(signTransaction).mockRejectedValue(new Error('Signing failed'));

			await expect(
				pay({
					token: mockToken,
					data: mockData,
					from,
					identity: mockIdentity,
					progress: mockProgress
				})
			).rejects.toThrowError('Signing failed');

			expect(mockProgress).toHaveBeenCalledTimes(2);
		});
	});
});
