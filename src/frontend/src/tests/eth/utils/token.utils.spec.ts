import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { calculateUsdValues, hasSufficientBalance } from '$eth/utils/token.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { PayableTokenWithFees } from '$lib/types/open-crypto-pay';
import type { Token } from '$lib/types/token';
import { certified } from '$tests/mocks/balances.mock';

describe('token.utils', () => {
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
});
