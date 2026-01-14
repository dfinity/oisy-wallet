import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import {
	calculateUsdValues,
	enrichEthEvmToken,
	hasSufficientBalance
} from '$eth/utils/token.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { ExchangesData } from '$lib/types/exchange';
import type { PayableTokenWithFees } from '$lib/types/open-crypto-pay';
import type { Token } from '$lib/types/token';
import { certified } from '$tests/mocks/balances.mock';

describe('open-crypto-pay-enrichment.utils', () => {
	const mockNativeToken: Token = {
		...ETHEREUM_TOKEN,
		decimals: 18
	};

	const mockErc20Token: PayableTokenWithFees = {
		...USDC_TOKEN,
		amount: '100',
		minFee: 0.0001,
		tokenNetwork: 'Ethereum',
		fee: {
			feeInWei: 21000000000000000n, // 0.021 ETH
			feeData: {
				maxFeePerGas: 12n,
				maxPriorityFeePerGas: 7n
			},
			estimatedGasLimit: 21000n
		}
	};

	const mockNativeEthToken: PayableTokenWithFees = {
		...ETHEREUM_TOKEN,
		amount: '1.5',
		minFee: 0.001,
		tokenNetwork: 'Ethereum',
		fee: {
			feeInWei: 21000000000000000n, // 0.021 ETH
			feeData: {
				maxFeePerGas: 12n,
				maxPriorityFeePerGas: 7n
			},
			estimatedGasLimit: 21000n
		}
	};

	describe('hasSufficientBalance', () => {
		const tokenAmount = 1000000000000000000n; // 1 ETH
		const feeInWei = 21000000000000000n; // 0.021 ETH

		it('should return true when native token has sufficient balance', () => {
			const balances: CertifiedStoreData<BalancesData> = {
				[ETHEREUM_TOKEN.id]: {
					data: 2000000000000000000n, // 2 ETH
					certified
				}
			};

			const result = hasSufficientBalance({
				token: mockNativeEthToken,
				tokenAmount,
				feeInWei,
				nativeToken: mockNativeToken,
				balances
			});

			expect(result).toBeTruthy();
		});

		it('should return false when native token has insufficient balance', () => {
			const balances: CertifiedStoreData<BalancesData> = {
				[ETHEREUM_TOKEN.id]: {
					data: 500000000000000000n, // 0.5 ETH
					certified
				}
			};

			const result = hasSufficientBalance({
				token: mockNativeEthToken,
				tokenAmount,
				feeInWei,
				nativeToken: mockNativeToken,
				balances
			});

			expect(result).toBeFalsy();
		});

		it('should return true when ERC20 token and native token both have sufficient balance', () => {
			const balances: CertifiedStoreData<BalancesData> = {
				[USDC_TOKEN.id]: {
					data: 2000000000n, // 2000 USDC (6 decimals)
					certified
				},
				[ETHEREUM_TOKEN.id]: {
					data: 100000000000000000n, // 0.1 ETH
					certified
				}
			};

			const result = hasSufficientBalance({
				token: mockErc20Token,
				tokenAmount: 1000000000n, // 1000 USDC
				feeInWei,
				nativeToken: mockNativeToken,
				balances
			});

			expect(result).toBeTruthy();
		});

		it('should return false when ERC20 token has insufficient balance', () => {
			const balances: CertifiedStoreData<BalancesData> = {
				[USDC_TOKEN.id]: {
					data: 500000000n, // 500 USDC
					certified
				},
				[ETHEREUM_TOKEN.id]: {
					data: 100000000000000000n, // 0.1 ETH
					certified
				}
			};

			const result = hasSufficientBalance({
				token: mockErc20Token,
				tokenAmount: 1000000000n, // 1000 USDC
				feeInWei,
				nativeToken: mockNativeToken,
				balances
			});

			expect(result).toBeFalsy();
		});

		it('should return false when native token has insufficient balance for ERC20 fee', () => {
			const balances: CertifiedStoreData<BalancesData> = {
				[USDC_TOKEN.id]: {
					data: 2000000000n, // 2000 USDC
					certified
				},
				[ETHEREUM_TOKEN.id]: {
					data: 10000000000000000n, // 0.01 ETH (less than fee)
					certified
				}
			};

			const result = hasSufficientBalance({
				token: mockErc20Token,
				tokenAmount: 1000000000n,
				feeInWei,
				nativeToken: mockNativeToken,
				balances
			});

			expect(result).toBeFalsy();
		});

		it('should handle zero balance for native token', () => {
			const balances: CertifiedStoreData<BalancesData> = {
				[ETHEREUM_TOKEN.id]: {
					data: ZERO,
					certified
				}
			};

			const result = hasSufficientBalance({
				token: mockNativeEthToken,
				tokenAmount,
				feeInWei,
				nativeToken: mockNativeToken,
				balances
			});

			expect(result).toBeFalsy();
		});

		it('should handle missing balance data for native token', () => {
			const balances: CertifiedStoreData<BalancesData> = {};

			const result = hasSufficientBalance({
				token: mockNativeEthToken,
				tokenAmount,
				feeInWei,
				nativeToken: mockNativeToken,
				balances
			});

			expect(result).toBeFalsy();
		});

		it('should handle exact balance requirement for native token', () => {
			const requiredBalance = tokenAmount + feeInWei;
			const balances: CertifiedStoreData<BalancesData> = {
				[ETHEREUM_TOKEN.id]: {
					data: requiredBalance,
					certified
				}
			};

			const result = hasSufficientBalance({
				token: mockNativeEthToken,
				tokenAmount,
				feeInWei,
				nativeToken: mockNativeToken,
				balances
			});

			expect(result).toBeTruthy();
		});
	});

	describe('calculateUsdValues', () => {
		const feeInWei = 21000000000000000n; // 0.021 ETH

		it('should calculate USD values correctly', () => {
			const result = calculateUsdValues({
				token: { ...mockNativeEthToken, amount: '1.5' },
				nativeToken: mockNativeToken,
				feeInWei,
				tokenPrice: 2000, // $2000 per ETH
				nativeTokenPrice: 2000
			});

			expect(result.amountInUSD).toBe(3000); // 1.5 * 2000
			expect(result.feeInUSD).toBe(42); // 0.021 * 2000
			expect(result.sumInUSD).toBe(3042); // 3000 + 42
		});

		it('should handle zero amount', () => {
			const result = calculateUsdValues({
				token: { ...mockNativeEthToken, amount: '0' },
				nativeToken: mockNativeToken,
				feeInWei,
				tokenPrice: 2000,
				nativeTokenPrice: 2000
			});

			expect(result.amountInUSD).toBe(0);
			expect(result.feeInUSD).toBe(42);
			expect(result.sumInUSD).toBe(42);
		});

		it('should handle zero fee', () => {
			const result = calculateUsdValues({
				token: { ...mockNativeEthToken, amount: '1.5' },
				nativeToken: mockNativeToken,
				feeInWei: ZERO,
				tokenPrice: 2000,
				nativeTokenPrice: 2000
			});

			expect(result.amountInUSD).toBe(3000);
			expect(result.feeInUSD).toBe(0);
			expect(result.sumInUSD).toBe(3000);
		});

		it('should handle different token prices', () => {
			const result = calculateUsdValues({
				token: { ...mockErc20Token, amount: '100' },
				nativeToken: mockNativeToken,
				feeInWei,
				tokenPrice: 1, // $1 per USDC
				nativeTokenPrice: 2000 // $2000 per ETH
			});

			expect(result.amountInUSD).toBe(100); // 100 * 1
			expect(result.feeInUSD).toBe(42); // 0.021 * 2000
			expect(result.sumInUSD).toBe(142);
		});

		it('should handle decimal amounts', () => {
			const result = calculateUsdValues({
				token: { ...mockNativeEthToken, amount: '0.123' },
				nativeToken: mockNativeToken,
				feeInWei,
				tokenPrice: 2000,
				nativeTokenPrice: 2000
			});

			expect(result.amountInUSD).toBe(246); // 0.123 * 2000
			expect(result.feeInUSD).toBe(42);
			expect(result.sumInUSD).toBe(288);
		});

		it('should handle very small fee values', () => {
			const smallFee = 1000000000000n; // 0.000001 ETH

			const result = calculateUsdValues({
				token: { ...mockNativeEthToken, amount: '1' },
				nativeToken: mockNativeToken,
				feeInWei: smallFee,
				tokenPrice: 2000,
				nativeTokenPrice: 2000
			});

			expect(result.amountInUSD).toBe(2000);
			expect(result.feeInUSD).toBeCloseTo(0.002, 6);
			expect(result.sumInUSD).toBeCloseTo(2000.002, 3);
		});
	});

	describe('enrichEthEvmToken', () => {
		const nativeTokens: Token[] = [mockNativeToken];

		const exchanges: ExchangesData = {
			[ETHEREUM_TOKEN.id]: { usd: 2000, usd_market_cap: 1000000 },
			[USDC_TOKEN.id]: { usd: 1, usd_market_cap: 50000 }
		};

		const balances: CertifiedStoreData<BalancesData> = {
			[ETHEREUM_TOKEN.id]: {
				data: 2000000000000000000n, // 2 ETH
				certified
			},
			[USDC_TOKEN.id]: {
				data: 2000000000n, // 2000 USDC
				certified
			}
		};

		it('should enrich token with USD values when all conditions met', () => {
			const result = enrichEthEvmToken({
				token: mockNativeEthToken,
				nativeTokens,
				exchanges,
				balances
			});

			expect(result).toBeDefined();
			expect(result?.amountInUSD).toBeDefined();
			expect(result?.feeInUSD).toBeDefined();
			expect(result?.sumInUSD).toBeDefined();
		});

		it('should return undefined when token has no fee', () => {
			const tokenWithoutFee = {
				...mockNativeEthToken,
				fee: undefined
			};

			const result = enrichEthEvmToken({
				token: tokenWithoutFee,
				nativeTokens,
				exchanges,
				balances
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined when native token not found', () => {
			const result = enrichEthEvmToken({
				token: mockNativeEthToken,
				nativeTokens: [],
				exchanges,
				balances
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined when native token price missing', () => {
			const exchangesWithoutNative: ExchangesData = {
				[USDC_TOKEN.id]: { usd: 1, usd_market_cap: 50000 }
			};

			const result = enrichEthEvmToken({
				token: mockNativeEthToken,
				nativeTokens,
				exchanges: exchangesWithoutNative,
				balances
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined when token price missing', () => {
			const exchangesWithoutToken: ExchangesData = {
				[ETHEREUM_TOKEN.id]: { usd: 2000, usd_market_cap: 1000000 }
			};

			const result = enrichEthEvmToken({
				token: mockErc20Token,
				nativeTokens,
				exchanges: exchangesWithoutToken,
				balances
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined when balance insufficient', () => {
			const insufficientBalances: CertifiedStoreData<BalancesData> = {
				[ETHEREUM_TOKEN.id]: {
					data: 100000000000000000n, // 0.1 ETH (insufficient)
					certified
				}
			};

			const result = enrichEthEvmToken({
				token: mockNativeEthToken,
				nativeTokens,
				exchanges,
				balances: insufficientBalances
			});

			expect(result).toBeUndefined();
		});

		it('should enrich ERC20 token correctly', () => {
			const result = enrichEthEvmToken({
				token: mockErc20Token,
				nativeTokens,
				exchanges,
				balances
			});

			expect(result).toBeDefined();
			expect(result?.amountInUSD).toBeDefined();
			expect(result?.feeInUSD).toBeDefined();
			expect(result?.sumInUSD).toBeDefined();
		});

		it('should preserve original token properties', () => {
			const result = enrichEthEvmToken({
				token: mockNativeEthToken,
				nativeTokens,
				exchanges,
				balances
			});

			expect(result?.id).toBe(mockNativeEthToken.id);
			expect(result?.symbol).toBe(mockNativeEthToken.symbol);
			expect(result?.amount).toBe(mockNativeEthToken.amount);
			expect(result?.fee).toBe(mockNativeEthToken.fee);
		});

		it('should handle exchanges undefined', () => {
			const result = enrichEthEvmToken({
				token: mockNativeEthToken,
				nativeTokens,
				exchanges: undefined,
				balances
			});

			expect(result).toBeUndefined();
		});

		it('should handle empty balances', () => {
			const result = enrichEthEvmToken({
				token: mockNativeEthToken,
				nativeTokens,
				exchanges,
				balances: {}
			});

			expect(result).toBeUndefined();
		});
	});
});
