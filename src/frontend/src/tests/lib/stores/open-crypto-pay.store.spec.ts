import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { initPayContext } from '$lib/stores/open-crypto-pay.store';
import type { OpenCryptoPayResponse, PayableTokenWithFees } from '$lib/types/open-crypto-pay';
import { get } from 'svelte/store';

describe('OpenCryptoPayStore', () => {
	const mockPaymentData: OpenCryptoPayResponse = {
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

	const mockEthTokenWithFee: PayableTokenWithFees = {
		...ETHEREUM_TOKEN,
		amount: '1.5',
		minFee: 0.001,
		tokenNetwork: 'Ethereum',
		fee: {
			feeInWei: 300n,
			feeData: {
				maxFeePerGas: 12n,
				maxPriorityFeePerGas: 7n
			},
			estimatedGasLimit: 25n
		}
	};

	const mockUsdcTokenWithFee: PayableTokenWithFees = {
		...USDC_TOKEN,
		amount: '100',
		minFee: 0.0001,
		tokenNetwork: 'Ethereum',
		fee: {
			feeInWei: 480n,
			feeData: {
				maxFeePerGas: 12n,
				maxPriorityFeePerGas: 7n
			},
			estimatedGasLimit: 40n
		}
	};

	describe('data store', () => {
		it('should initialize with undefined data', () => {
			const context = initPayContext();

			expect(get(context.data)).toBeUndefined();
		});

		it('should set payment data', () => {
			const context = initPayContext();

			context.setData(mockPaymentData);

			expect(get(context.data)).toEqual(mockPaymentData);
		});

		it('should override previous payment data when setting new one', () => {
			const context = initPayContext();

			const newPaymentData: OpenCryptoPayResponse = {
				...mockPaymentData,
				id: 'pl_new456',
				displayName: 'New Shop',
				requestedAmount: {
					asset: 'EUR',
					amount: '20'
				}
			};

			context.setData(mockPaymentData);
			context.setData(newPaymentData);

			expect(get(context.data)).toEqual(newPaymentData);
			expect(get(context.data)).not.toEqual(mockPaymentData);
		});

		it('should handle multiple consecutive updates', () => {
			const context = initPayContext();

			const firstUpdate: OpenCryptoPayResponse = {
				...mockPaymentData,
				displayName: 'First'
			};

			const secondUpdate: OpenCryptoPayResponse = {
				...mockPaymentData,
				displayName: 'Second'
			};

			const thirdUpdate: OpenCryptoPayResponse = {
				...mockPaymentData,
				displayName: 'Third'
			};

			context.setData(firstUpdate);
			context.setData(secondUpdate);
			context.setData(thirdUpdate);

			expect(get(context.data)).toEqual(thirdUpdate);
		});

		it('should replace entire state with new data', () => {
			const context = initPayContext();

			context.setData(mockPaymentData);

			const completelyNewData: OpenCryptoPayResponse = {
				...mockPaymentData,
				id: 'pl_different',
				externalId: 'different-external',
				minSendable: 5000,
				maxSendable: 50000
			};

			context.setData(completelyNewData);

			expect(get(context.data)).toEqual(completelyNewData);
		});
	});

	describe('availableTokens store', () => {
		it('should initialize with empty array', () => {
			const context = initPayContext();

			expect(get(context.availableTokens)).toEqual([]);
		});

		it('should set tokens with fees', () => {
			const context = initPayContext();

			const tokens = [mockEthTokenWithFee];

			context.setTokensWithFees(tokens);

			expect(get(context.availableTokens)).toEqual(tokens);
		});

		it('should set multiple tokens with fees', () => {
			const context = initPayContext();

			const tokens = [mockEthTokenWithFee, mockUsdcTokenWithFee];

			context.setTokensWithFees(tokens);

			expect(get(context.availableTokens)).toEqual(tokens);
			expect(get(context.availableTokens)).toHaveLength(2);
		});

		it('should override previous tokens when setting new ones', () => {
			const context = initPayContext();

			const firstTokens = [mockEthTokenWithFee];
			const secondTokens = [mockUsdcTokenWithFee];

			context.setTokensWithFees(firstTokens);
			context.setTokensWithFees(secondTokens);

			expect(get(context.availableTokens)).toEqual(secondTokens);
			expect(get(context.availableTokens)).not.toEqual(firstTokens);
		});

		it('should handle empty array of tokens', () => {
			const context = initPayContext();

			context.setTokensWithFees([mockEthTokenWithFee]);
			context.setTokensWithFees([]);

			expect(get(context.availableTokens)).toEqual([]);
		});

		it('should handle multiple consecutive updates', () => {
			const context = initPayContext();

			const firstUpdate = [mockEthTokenWithFee];
			const secondUpdate = [mockUsdcTokenWithFee];
			const thirdUpdate = [mockEthTokenWithFee, mockUsdcTokenWithFee];

			context.setTokensWithFees(firstUpdate);
			context.setTokensWithFees(secondUpdate);
			context.setTokensWithFees(thirdUpdate);

			expect(get(context.availableTokens)).toEqual(thirdUpdate);
			expect(get(context.availableTokens)).toHaveLength(2);
		});

		it('should preserve token data structure', () => {
			const context = initPayContext();

			context.setTokensWithFees([mockEthTokenWithFee]);

			const [result] = get(context.availableTokens);

			expect(result).toMatchObject({
				...ETHEREUM_TOKEN,
				amount: '1.5',
				minFee: 0.001,
				tokenNetwork: 'Ethereum',
				fee: {
					feeInWei: 300n,
					feeData: expect.any(Object),
					estimatedGasLimit: 25n
				}
			});
		});

		it('should handle tokens without fees', () => {
			const context = initPayContext();

			const tokenWithoutFee: PayableTokenWithFees = {
				...ETHEREUM_TOKEN,
				amount: '1.5',
				minFee: 0.001,
				tokenNetwork: 'Ethereum',
				fee: undefined
			};

			context.setTokensWithFees([tokenWithoutFee]);

			expect(get(context.availableTokens)).toEqual([tokenWithoutFee]);
			expect(get(context.availableTokens)[0].fee).toBeUndefined();
		});

		it('should handle mixed tokens with and without fees', () => {
			const context = initPayContext();

			const tokenWithoutFee: PayableTokenWithFees = {
				...USDC_TOKEN,
				amount: '100',
				minFee: 0.0001,
				tokenNetwork: 'Ethereum',
				fee: undefined
			} as PayableTokenWithFees;

			const tokens = [mockEthTokenWithFee, tokenWithoutFee];

			context.setTokensWithFees(tokens);

			expect(get(context.availableTokens)).toHaveLength(2);
			expect(get(context.availableTokens)[0].fee).toBeDefined();
			expect(get(context.availableTokens)[1].fee).toBeUndefined();
		});
	});

	describe('combined operations', () => {
		it('should handle setting both data and tokens', () => {
			const context = initPayContext();

			context.setData(mockPaymentData);
			context.setTokensWithFees([mockEthTokenWithFee]);

			expect(get(context.data)).toEqual(mockPaymentData);
			expect(get(context.availableTokens)).toEqual([mockEthTokenWithFee]);
		});

		it('should maintain independence between data and tokens stores', () => {
			const context = initPayContext();

			context.setData(mockPaymentData);
			context.setTokensWithFees([mockEthTokenWithFee]);

			context.setData({ ...mockPaymentData, displayName: 'Updated' });

			expect(get(context.data)?.displayName).toBe('Updated');
			expect(get(context.availableTokens)).toEqual([mockEthTokenWithFee]);
		});

		it('should allow updating tokens without affecting data', () => {
			const context = initPayContext();

			context.setData(mockPaymentData);
			context.setTokensWithFees([mockEthTokenWithFee]);

			context.setTokensWithFees([mockUsdcTokenWithFee]);

			expect(get(context.data)).toEqual(mockPaymentData);
			expect(get(context.availableTokens)).toEqual([mockUsdcTokenWithFee]);
		});
	});
});
