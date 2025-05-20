import type {
	SwapAmountsReply,
	SwapAmountsTxReply
} from '$declarations/kong_backend/kong_backend.did';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_SYMBOL, ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { ZERO } from '$lib/constants/app.constants';
import {
	ICP_SWAP_PROVIDER,
	KONG_SWAP_PROVIDER,
	SWAP_DEFAULT_SLIPPAGE_VALUE
} from '$lib/constants/swap.constants';
import type { ICPSwapResult } from '$lib/types/swap';
import { formatToken } from '$lib/utils/format.utils';
import {
	calculateSlippage,
	formatReceiveOutMinimum,
	getKongIcTokenIdentifier,
	getLiquidityFees,
	getNetworkFee,
	getSwapRoute,
	mapIcpSwapResult,
	mapKongSwapResult
} from '$lib/utils/swap.utils';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockTokens } from '$tests/mocks/tokens.mock';

describe('swap utils', () => {
	const ICP_LP_FEE = 4271n;
	const ICP_GAS_FEE = ZERO;

	const ETH_LP_FEE = 4267n;
	const ETH_GAS_FEE = 10000n;

	const transactions: SwapAmountsTxReply[] = [
		{
			gas_fee: ICP_GAS_FEE,
			lp_fee: ICP_LP_FEE,
			pay_address: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
			pay_amount: 52334806n,
			pay_chain: 'IC',
			pay_symbol: 'ICP',
			pool_symbol: 'ICP_ckUSDT',
			price: 5.43339933,
			receive_address: 'cngnf-vqaaa-aaaar-qag4q-cai',
			receive_amount: 2843559n,
			receive_chain: 'IC',
			receive_symbol: ICP_SYMBOL
		},
		{
			gas_fee: ETH_GAS_FEE,
			lp_fee: ETH_LP_FEE,
			pay_address: 'cngnf-vqaaa-aaaar-qag4q-cai',
			pay_amount: 2843559n,
			pay_chain: 'IC',
			pay_symbol: 'ckUSDT',
			pool_symbol: 'ckUSDC_ckUSDT',
			price: 0.99554432,
			receive_address: 'xevnm-gaaaa-aaaar-qafnq-cai',
			receive_amount: 2830889n,
			receive_chain: 'IC',
			receive_symbol: 'ETH'
		}
	];

	describe('getSwapRoute', () => {
		it('should return a list of token symbols', () => {
			const route = getSwapRoute(transactions);

			expect(route).includes(ICP_SYMBOL);
			expect(route).includes('ETH');
		});

		it('should return an empty list', () => {
			const route = getSwapRoute([]);

			expect(route).toHaveLength(0);
		});
	});

	describe('getLiquidityFees', () => {
		it('should return a list of liquidity fees', () => {
			const liquidityFees = getLiquidityFees({ transactions, tokens: mockTokens });

			expect(liquidityFees).toHaveLength(2);

			expect(liquidityFees[0].fee).toBe(ICP_LP_FEE);
			expect(liquidityFees[0].token).toBe(ICP_TOKEN);

			expect(liquidityFees[1].fee).toBe(ETH_LP_FEE);
			expect(liquidityFees[1].token).toBe(ETHEREUM_TOKEN);
		});

		it('should return an empty list if no transactions are provided', () => {
			const liquidityFees = getLiquidityFees({ transactions: [], tokens: mockTokens });

			expect(liquidityFees).toHaveLength(0);
		});

		it('should return a subset if token cannot be found', () => {
			const liquidityFees = getLiquidityFees({ transactions, tokens: [ICP_TOKEN] });

			expect(liquidityFees).toHaveLength(1);

			expect(liquidityFees[0].fee).toBe(ICP_LP_FEE);
			expect(liquidityFees[0].token).toBe(ICP_TOKEN);
		});
	});

	describe('getNetworkFee', () => {
		it('should return the network fee', () => {
			const networkFee = getNetworkFee({ transactions, tokens: mockTokens });

			expect(networkFee).toBeDefined();
			expect(networkFee?.fee).toBe(ICP_GAS_FEE + ETH_GAS_FEE);
			expect(networkFee?.token).toBe(ETHEREUM_TOKEN);
		});

		it('should return undefined if no transactions are provided', () => {
			const networkFee = getNetworkFee({ transactions: [], tokens: mockTokens });

			expect(networkFee).toBeUndefined();
		});

		it('should return undefined if token cannot be found', () => {
			const networkFee = getNetworkFee({ transactions, tokens: [] });

			expect(networkFee).toBeUndefined();
		});
	});

	describe('getKongIcTokenIdentifier', () => {
		it('returns correct kong token identifier for IC token', () => {
			expect(getKongIcTokenIdentifier(mockValidIcToken)).toBe(
				`IC.${mockValidIcToken.ledgerCanisterId}`
			);
		});

		it('returns empty string for non-IC token', () => {
			expect(getKongIcTokenIdentifier(BTC_MAINNET_TOKEN)).toBe('');
		});
	});

	describe('mapIcpSwapResult', () => {
		const baseSwap: ICPSwapResult = {
			receiveAmount: 1000n
		};

		it('should return mapped result with valid numeric slippage as string', () => {
			const result = mapIcpSwapResult({ swap: baseSwap, slippage: '0.5' });

			expect(result.provider).toBe(ICP_SWAP_PROVIDER);

			assert(result.provider === ICP_SWAP_PROVIDER);

			expect(result.receiveAmount).toBe(1000n);
			expect(result.receiveOutMinimum).toBe(
				calculateSlippage({ quoteAmount: 1000n, slippagePercentage: 0.5 })
			);
			expect(result.swapDetails).toBe(baseSwap);
		});

		it('should return mapped result with numeric slippage', () => {
			const result = mapIcpSwapResult({ swap: baseSwap, slippage: 0.3 });

			assert(result.provider === ICP_SWAP_PROVIDER);

			expect(result.receiveOutMinimum).toBe(
				calculateSlippage({ quoteAmount: 1000n, slippagePercentage: 0.3 })
			);
		});

		it('should fallback to default slippage if value is NaN', () => {
			const result = mapIcpSwapResult({ swap: baseSwap, slippage: 'string' });

			assert(result.provider === ICP_SWAP_PROVIDER);

			expect(result.receiveOutMinimum).toBe(
				calculateSlippage({
					quoteAmount: 1000n,
					slippagePercentage: SWAP_DEFAULT_SLIPPAGE_VALUE
				})
			);
		});

		it('should fallback to default slippage if empty string is passed', () => {
			const result = mapIcpSwapResult({ swap: baseSwap, slippage: '' });

			assert(result.provider === ICP_SWAP_PROVIDER);

			expect(result.receiveOutMinimum).toBe(
				calculateSlippage({
					quoteAmount: 1000n,
					slippagePercentage: SWAP_DEFAULT_SLIPPAGE_VALUE
				})
			);
		});
	});

	describe('mapKongSwapResult', () => {
		const tokens = mockTokens;
		const swap: SwapAmountsReply = {
			slippage: 0.3,
			receive_amount: 2000n,
			txs: [],
			receive_chain: 'icp',
			mid_price: 1.0,
			pay_amount: 1000n,
			receive_symbol: 'BBB',
			pay_symbol: 'AAA',
			receive_address: 'address1',
			pay_address: 'address2',
			price: 1.0,
			pay_chain: 'icp'
		};

		it('should return mapped kong swap result', () => {
			const result = mapKongSwapResult({ swap, tokens });

			expect(result.provider).toBe(KONG_SWAP_PROVIDER);

			assert(result.provider === KONG_SWAP_PROVIDER);

			expect(result.slippage).toBe(0.3);
			expect(result.receiveAmount).toBe(2000n);
			expect(result.swapDetails).toBe(swap);
		});
	});

	describe('calculateSlippage', () => {
		it('returns exact same amount for 0% slippage', () => {
			expect(calculateSlippage({ quoteAmount: 1000n, slippagePercentage: 0 })).toBe(1000n);
		});

		it('reduces amount correctly for 0.5% slippage', () => {
			expect(calculateSlippage({ quoteAmount: 10000n, slippagePercentage: 0.5 })).toBe(9950n);
		});

		it('reduces amount correctly for 1.23% slippage (rounded down)', () => {
			expect(calculateSlippage({ quoteAmount: 10000n, slippagePercentage: 1.23 })).toBe(9877n);
		});

		it('handles high precision decimals by rounding down the factor', () => {
			expect(calculateSlippage({ quoteAmount: 10000n, slippagePercentage: 0.001 })).toBe(9999n);
		});

		it('returns 0 for full slippage (100%)', () => {
			expect(calculateSlippage({ quoteAmount: 12345n, slippagePercentage: 100 })).toBe(0n);
		});
	});

	describe('formatReceiveOutMinimum', () => {
		it('formats valid number slippage', () => {
			const result = formatReceiveOutMinimum({
				slippageValue: 5,
				receiveAmount: 1000n,
				decimals: 2
			});

			const expectedMinimum = calculateSlippage({
				quoteAmount: 1000n,
				slippagePercentage: 5
			});

			const expectedFormatted = formatToken({
				value: expectedMinimum,
				unitName: 2,
				displayDecimals: 2
			});

			expect(result).toBe(expectedFormatted);
		});

		it('formats valid string slippage', () => {
			const result = formatReceiveOutMinimum({
				slippageValue: '1',
				receiveAmount: 1000n,
				decimals: 2
			});

			const expectedMinimum = calculateSlippage({
				quoteAmount: 1000n,
				slippagePercentage: 1
			});

			const expectedFormatted = formatToken({
				value: expectedMinimum,
				unitName: 2,
				displayDecimals: 2
			});

			expect(result).toBe(expectedFormatted);
		});

		it('returns null for empty slippage string', () => {
			const result = formatReceiveOutMinimum({
				slippageValue: '',
				receiveAmount: 1000n,
				decimals: 2
			});

			expect(result).toBeUndefined();
		});

		it('returns null for undefined slippage', () => {
			const result = formatReceiveOutMinimum({
				slippageValue: undefined,
				receiveAmount: 1000n,
				decimals: 2
			});

			expect(result).toBeUndefined();
		});
	});
});
