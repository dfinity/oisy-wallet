import { enabledMainnetBitcoinToken } from '$btc/derived/tokens.derived';
import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
import { enabledEvmTokens } from '$evm/derived/tokens.derived';
import { Currency } from '$lib/enums/currency';
import { Languages } from '$lib/enums/languages';
import { createTokenComparator, initPayContext } from '$lib/stores/open-crypto-pay.store';
import type { CurrencyExchangeData } from '$lib/types/currency';
import type {
	OpenCryptoPayResponse,
	PayableTokenWithConvertedAmount,
	PayableTokenWithFees
} from '$lib/types/open-crypto-pay';
import { get } from 'svelte/store';

vi.mock('$btc/derived/tokens.derived', () => ({
	enabledMainnetBitcoinToken: {
		subscribe: vi.fn((callback) => {
			callback(undefined);
			return () => {};
		})
	}
}));

vi.mock('$eth/derived/tokens.derived', () => ({
	enabledEthereumTokens: {
		subscribe: vi.fn((callback) => {
			callback([]);
			return () => {};
		})
	}
}));

vi.mock('$evm/derived/tokens.derived', () => ({
	enabledEvmTokens: {
		subscribe: vi.fn((callback) => {
			callback([]);
			return () => {};
		})
	}
}));

vi.mock('$lib/derived/exchange.derived', () => ({
	exchanges: {
		subscribe: vi.fn((callback) => {
			callback({});
			return () => {};
		})
	}
}));

vi.mock('$lib/stores/balances.store', () => ({
	balancesStore: {
		subscribe: vi.fn((callback) => {
			callback({});
			return () => {};
		})
	}
}));

vi.mock('$eth/utils/eth-open-crypto-pay.utils', () => ({
	enrichEthEvmPayableToken: vi.fn(({ token }) => ({
		...token
	}))
}));

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
	} as PayableTokenWithFees;

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
	} as PayableTokenWithFees;

	const mockTokenWithConvertedAmount: PayableTokenWithConvertedAmount = {
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

			context.setAvailableTokens(tokens);

			expect(get(context.availableTokens)).toEqual(tokens);
		});

		it('should set multiple tokens with fees', () => {
			const context = initPayContext();

			const tokens = [mockEthTokenWithFee, mockUsdcTokenWithFee];

			context.setAvailableTokens(tokens);

			expect(get(context.availableTokens)).toEqual(tokens);
			expect(get(context.availableTokens)).toHaveLength(2);
		});

		it('should override previous tokens when setting new ones', () => {
			const context = initPayContext();

			const firstTokens = [mockEthTokenWithFee];
			const secondTokens = [mockUsdcTokenWithFee];

			context.setAvailableTokens(firstTokens);
			context.setAvailableTokens(secondTokens);

			expect(get(context.availableTokens)).toEqual(secondTokens);
			expect(get(context.availableTokens)).not.toEqual(firstTokens);
		});

		it('should handle empty array of tokens', () => {
			const context = initPayContext();

			context.setAvailableTokens([mockEthTokenWithFee]);
			context.setAvailableTokens([]);

			expect(get(context.availableTokens)).toEqual([]);
		});

		it('should handle multiple consecutive updates', () => {
			const context = initPayContext();

			const firstUpdate = [mockEthTokenWithFee];
			const secondUpdate = [mockUsdcTokenWithFee];
			const thirdUpdate = [mockEthTokenWithFee, mockUsdcTokenWithFee];

			context.setAvailableTokens(firstUpdate);
			context.setAvailableTokens(secondUpdate);
			context.setAvailableTokens(thirdUpdate);

			expect(get(context.availableTokens)).toEqual(thirdUpdate);
			expect(get(context.availableTokens)).toHaveLength(2);
		});

		it('should handle tokens without fees', () => {
			const context = initPayContext();

			const tokenWithoutFee: PayableTokenWithFees = {
				...ETHEREUM_TOKEN,
				amount: '1.5',
				minFee: 0.001,
				tokenNetwork: 'Ethereum',
				fee: undefined
			} as PayableTokenWithFees;

			context.setAvailableTokens([tokenWithoutFee]);

			expect(get(context.availableTokens)).toEqual([]);
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

			context.setAvailableTokens(tokens);

			expect(get(context.availableTokens)).toHaveLength(1);
			expect(get(context.availableTokens)[0].fee).toBeDefined();
		});
	});

	describe('combined operations', () => {
		beforeEach(() => {
			vi.resetAllMocks();

			vi.spyOn(enabledMainnetBitcoinToken, 'subscribe').mockImplementation((fn) => {
				fn(undefined);
				return () => {};
			});

			vi.spyOn(enabledEthereumTokens, 'subscribe').mockImplementation((fn) => {
				fn([]);
				return () => {};
			});

			vi.spyOn(enabledEvmTokens, 'subscribe').mockImplementation((fn) => {
				fn([]);
				return () => {};
			});
		});

		it('should handle setting both data and tokens', () => {
			const context = initPayContext();

			context.setData(mockPaymentData);
			context.setAvailableTokens([mockEthTokenWithFee]);

			expect(get(context.data)).toEqual(mockPaymentData);
			expect(get(context.availableTokens)).toEqual([mockEthTokenWithFee]);
		});

		it('should maintain independence between data and tokens stores', () => {
			const context = initPayContext();

			context.setData(mockPaymentData);
			context.setAvailableTokens([mockEthTokenWithFee]);

			context.setData({ ...mockPaymentData, displayName: 'Updated' });

			expect(get(context.data)?.displayName).toBe('Updated');
			expect(get(context.availableTokens)).toEqual([mockEthTokenWithFee]);
		});

		it('should allow updating tokens without affecting data', () => {
			const context = initPayContext();

			context.setData(mockPaymentData);
			context.setAvailableTokens([mockEthTokenWithFee]);

			context.setAvailableTokens([mockUsdcTokenWithFee]);

			expect(get(context.data)).toEqual(mockPaymentData);
			expect(get(context.availableTokens)).toEqual([mockUsdcTokenWithFee]);
		});
	});

	describe('reset store', () => {
		it('should reset all stores to initial state', () => {
			const context = initPayContext();

			context.setData(mockPaymentData);
			context.setAvailableTokens([mockEthTokenWithFee, mockUsdcTokenWithFee]);

			context.reset();

			expect(get(context.data)).toBeUndefined();
			expect(get(context.availableTokens)).toEqual([]);
			expect(get(context.selectedToken)).toBeUndefined();
		});

		it('should reset when stores are already empty', () => {
			const context = initPayContext();

			context.reset();

			expect(get(context.data)).toBeUndefined();
			expect(get(context.availableTokens)).toEqual([]);
			expect(get(context.selectedToken)).toBeUndefined();
		});

		it('should reset after setting only data', () => {
			const context = initPayContext();

			context.setData(mockPaymentData);

			expect(get(context.data)).toBeDefined();

			context.reset();

			expect(get(context.data)).toBeUndefined();
		});

		it('should reset after setting only tokens', () => {
			const context = initPayContext();

			context.setAvailableTokens([mockEthTokenWithFee]);

			expect(get(context.availableTokens)).toHaveLength(1);

			context.reset();

			expect(get(context.availableTokens)).toEqual([]);
		});

		it('should reset user selection', () => {
			const context = initPayContext();

			context.setAvailableTokens([mockEthTokenWithFee, mockUsdcTokenWithFee]);
			context.selectToken(mockTokenWithConvertedAmount);

			expect(get(context.selectedToken)).toBeDefined();

			context.reset();

			expect(get(context.selectedToken)).toBeUndefined();
		});

		it('should allow multiple consecutive resets', () => {
			const context = initPayContext();

			context.setData(mockPaymentData);
			context.setAvailableTokens([mockEthTokenWithFee]);

			context.reset();
			context.reset();
			context.reset();

			expect(get(context.data)).toBeUndefined();
			expect(get(context.availableTokens)).toEqual([]);
			expect(get(context.selectedToken)).toBeUndefined();
		});

		it('should allow setting new data after reset', () => {
			const context = initPayContext();

			context.setData(mockPaymentData);
			context.setAvailableTokens([mockEthTokenWithFee]);

			context.reset();

			const newData: OpenCryptoPayResponse = {
				...mockPaymentData,
				displayName: 'After Reset'
			};

			context.setData(newData);
			context.setAvailableTokens([mockUsdcTokenWithFee]);

			expect(get(context.data)).toEqual(newData);
			expect(get(context.availableTokens)).toEqual([mockUsdcTokenWithFee]);
		});

		it('should handle reset in for the hole workflow', () => {
			const context = initPayContext();

			context.setData(mockPaymentData);
			context.setAvailableTokens([mockEthTokenWithFee, mockUsdcTokenWithFee]);
			context.selectToken(mockTokenWithConvertedAmount);

			expect(get(context.data)).toBeDefined();
			expect(get(context.availableTokens)).toHaveLength(2);
			expect(get(context.selectedToken)).toBeDefined();

			context.reset();

			expect(get(context.data)).toBeUndefined();
			expect(get(context.availableTokens)).toEqual([]);
			expect(get(context.selectedToken)).toBeUndefined();
		});
	});

	describe('failedPaymentError store', () => {
		it('should initialize with undefined', () => {
			const context = initPayContext();

			expect(get(context.failedPaymentError)).toBeUndefined();
		});

		it('should set error message', () => {
			const context = initPayContext();

			context.failedPaymentError.set('Payment failed: insufficient funds');

			expect(get(context.failedPaymentError)).toBe('Payment failed: insufficient funds');
		});

		it('should update error message', () => {
			const context = initPayContext();

			context.failedPaymentError.set('Network error');
			context.failedPaymentError.set('Transaction rejected');

			expect(get(context.failedPaymentError)).toBe('Transaction rejected');
		});

		it('should clear error by setting undefined', () => {
			const context = initPayContext();

			context.failedPaymentError.set('Some error');
			context.failedPaymentError.set(undefined);

			expect(get(context.failedPaymentError)).toBeUndefined();
		});

		it('should remain independent from other stores', () => {
			const context = initPayContext();

			context.setData(mockPaymentData);
			context.setAvailableTokens([mockEthTokenWithFee]);
			context.failedPaymentError.set('Payment error');

			expect(get(context.data)).toEqual(mockPaymentData);
			expect(get(context.availableTokens)).toEqual([mockEthTokenWithFee]);
			expect(get(context.failedPaymentError)).toBe('Payment error');

			context.failedPaymentError.set(undefined);

			expect(get(context.data)).toEqual(mockPaymentData);
			expect(get(context.availableTokens)).toEqual([mockEthTokenWithFee]);
		});

		it('should handle multiple error messages in sequence', () => {
			const context = initPayContext();

			const errors = [
				'Network timeout',
				'Invalid signature',
				'Gas estimation failed',
				'User rejected transaction'
			];

			errors.forEach((error) => {
				context.failedPaymentError.set(error);

				expect(get(context.failedPaymentError)).toBe(error);
			});
		});

		it('should handle empty string as error', () => {
			const context = initPayContext();

			context.failedPaymentError.set('');

			expect(get(context.failedPaymentError)).toBe('');
		});
	});

	describe('createTokenComparator', () => {
		const exchangeRate: CurrencyExchangeData = {
			currency: Currency.USD,
			exchangeRateToUsd: 1,
			exchangeRate24hChangeMultiplier: null
		};

		const comparator = createTokenComparator({
			currency: Currency.USD,
			exchangeRate,
			language: Languages.ENGLISH
		});

		const buildToken = ({
			network,
			tokenNetwork,
			symbol,
			sumInUSD
		}: {
			network: PayableTokenWithConvertedAmount['network'];
			tokenNetwork: PayableTokenWithConvertedAmount['tokenNetwork'];
			symbol: string;
			sumInUSD: number;
		}): PayableTokenWithConvertedAmount =>
			({
				...ETHEREUM_TOKEN,
				network,
				tokenNetwork,
				symbol,
				amount: '1',
				amountInUSD: sumInUSD - 1,
				feeInUSD: 1,
				sumInUSD
			}) as PayableTokenWithConvertedAmount;

		const icpToken = buildToken({
			network: { ...ICP_NETWORK, pay: { openCryptoPay: 'InternetComputer' } },
			tokenNetwork: 'InternetComputer',
			symbol: 'ICP',
			sumInUSD: 10
		});

		const ethToken = buildToken({
			network: { ...ETHEREUM_NETWORK, pay: { openCryptoPay: 'Ethereum' } },
			tokenNetwork: 'Ethereum',
			symbol: 'ETH',
			sumInUSD: 10
		});

		const usdcEthToken = buildToken({
			network: { ...ETHEREUM_NETWORK, pay: { openCryptoPay: 'Ethereum' } },
			tokenNetwork: 'Ethereum',
			symbol: 'USDC',
			sumInUSD: 10
		});

		const usdcBaseToken = buildToken({
			network: { ...BASE_NETWORK, pay: { openCryptoPay: 'Base' } },
			tokenNetwork: 'Base',
			symbol: 'USDC',
			sumInUSD: 10
		});

		const btcToken = buildToken({
			network: { ...BTC_MAINNET_NETWORK, pay: { openCryptoPay: 'Bitcoin' } },
			tokenNetwork: 'Bitcoin',
			symbol: 'BTC',
			sumInUSD: 10
		});

		it('should sort by displayed fiat value ascending', () => {
			const cheapToken = { ...ethToken, sumInUSD: 5, amountInUSD: 4 };
			const expensiveToken = { ...ethToken, sumInUSD: 20, amountInUSD: 19 };

			expect(comparator(cheapToken, expensiveToken)).toBeLessThan(0);
			expect(comparator(expensiveToken, cheapToken)).toBeGreaterThan(0);
		});

		it('should sort ICP before EVM when fiat value is equal', () => {
			expect(comparator(icpToken, ethToken)).toBeLessThan(0);
			expect(comparator(ethToken, icpToken)).toBeGreaterThan(0);
		});

		it('should sort ICP before BTC when fiat value is equal', () => {
			expect(comparator(icpToken, btcToken)).toBeLessThan(0);
			expect(comparator(btcToken, icpToken)).toBeGreaterThan(0);
		});

		it('should sort EVM before BTC when fiat value is equal', () => {
			expect(comparator(ethToken, btcToken)).toBeLessThan(0);
			expect(comparator(btcToken, ethToken)).toBeGreaterThan(0);
		});

		it('should sort by symbol ascending within same network type and fiat value', () => {
			expect(comparator(ethToken, usdcEthToken)).toBeLessThan(0);
			expect(comparator(usdcEthToken, ethToken)).toBeGreaterThan(0);
		});

		it('should sort by network name ascending within same network type, symbol, and fiat value', () => {
			expect(comparator(usdcBaseToken, usdcEthToken)).toBeLessThan(0);
			expect(comparator(usdcEthToken, usdcBaseToken)).toBeGreaterThan(0);
		});

		it('should return 0 for identical tokens', () => {
			expect(comparator(icpToken, icpToken)).toBe(0);
		});

		it('should prioritize fiat value over network type', () => {
			const cheapBtc = { ...btcToken, sumInUSD: 5, amountInUSD: 4 };
			const expensiveIcp = { ...icpToken, sumInUSD: 20, amountInUSD: 19 };

			expect(comparator(cheapBtc, expensiveIcp)).toBeLessThan(0);
		});

		it('should sort a full list correctly with all criteria', () => {
			const tokens = [btcToken, usdcEthToken, icpToken, usdcBaseToken, ethToken];

			const sorted = [...tokens].sort(comparator);

			expect(sorted.map(({ symbol, network }) => `${symbol}@${network.name}`)).toEqual([
				'ICP@Internet Computer',
				'ETH@Ethereum',
				'USDC@Base',
				'USDC@Ethereum',
				'BTC@Bitcoin'
			]);
		});
	});
});
