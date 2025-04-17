import type { SwapAmountsTxReply } from '$declarations/kong_backend/kong_backend.did';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_SYMBOL, ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { ZERO_BI } from '$lib/constants/app.constants';
import {
	getKongIcTokenIdentifier,
	getLiquidityFees,
	getNetworkFee,
	getSwapRoute
} from '$lib/utils/swap.utils';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockTokens } from '$tests/mocks/tokens.mock';

describe('swap utils', () => {
	const ICP_LP_FEE = 4271n;
	const ICP_GAS_FEE = ZERO_BI;

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

			expect(route.length).toBe(0);
		});
	});

	describe('getLiquidityFees', () => {
		it('should return a list of liquidity fees', () => {
			const liquidityFees = getLiquidityFees({ transactions, tokens: mockTokens });

			expect(liquidityFees.length).toBe(2);

			expect(liquidityFees[0].fee).toBe(ICP_LP_FEE);
			expect(liquidityFees[0].token).toBe(ICP_TOKEN);

			expect(liquidityFees[1].fee).toBe(ETH_LP_FEE);
			expect(liquidityFees[1].token).toBe(ETHEREUM_TOKEN);
		});

		it('should return an empty list if no transactions are provided', () => {
			const liquidityFees = getLiquidityFees({ transactions: [], tokens: mockTokens });

			expect(liquidityFees.length).toBe(0);
		});

		it('should return a subset if token cannot be found', () => {
			const liquidityFees = getLiquidityFees({ transactions, tokens: [ICP_TOKEN] });

			expect(liquidityFees.length).toBe(1);

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
});
