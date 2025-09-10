import type {
	SwapAmountsReply,
	SwapAmountsTxReply
} from '$declarations/kong_backend/kong_backend.did';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_SYMBOL, ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { Erc20Token } from '$eth/types/erc20';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import { ZERO } from '$lib/constants/app.constants';
import {
	ICP_SWAP_PROVIDER,
	KONG_SWAP_PROVIDER,
	SWAP_DEFAULT_SLIPPAGE_VALUE,
	SWAP_ETH_TOKEN_PLACEHOLDER,
	VELORA_SWAP_PROVIDER
} from '$lib/constants/swap.constants';
import { SwapError } from '$lib/services/swap-errors.services';
import { SwapErrorCodes, SwapProvider, VeloraSwapTypes, type ICPSwapResult } from '$lib/types/swap';
import { formatToken } from '$lib/utils/format.utils';
import {
	calculateSlippage,
	findSwapProvider,
	formatReceiveOutMinimum,
	geSwapEthTokenAddress,
	getKongIcTokenIdentifier,
	getLiquidityFees,
	getNetworkFee,
	getSwapRoute,
	getWithdrawableToken,
	isSwapError,
	mapIcpSwapResult,
	mapKongSwapResult,
	mapVeloraMarketSwapResult,
	mapVeloraSwapResult
} from '$lib/utils/swap.utils';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockTokens } from '$tests/mocks/tokens.mock';
import type { Bridge, DeltaPrice, OptimalRate, SwapSide } from '@velora-dex/sdk';

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

	describe('mapVeloraSwapResult', () => {
		it('should map DeltaPrice swap result correctly', () => {
			const mockDeltaSwap: DeltaPrice = {
				srcToken: '0x123',
				destToken: '0x456',
				srcAmount: '1000',
				destAmount: '900',
				destAmountBeforeFee: '920',
				gasCost: '50000',
				gasCostBeforeFee: '48000',
				gasCostUSD: '15.5',
				gasCostUSDBeforeFee: '14.8',
				srcUSD: '1000.0',
				destUSD: '895.5',
				destUSDBeforeFee: '915.2',
				partner: 'PartnerName',
				partnerFee: 0.25,
				hmac: 'abcd1234',
				bridge: {} as Bridge
			};

			const result = mapVeloraSwapResult(mockDeltaSwap);

			expect(result.provider).toBe(VELORA_SWAP_PROVIDER);
			expect(result.receiveAmount).toBe(900n);
			expect(result.swapDetails).toBe(mockDeltaSwap);
			expect(result.type).toBe(VeloraSwapTypes.DELTA);
		});

		it('should map BridgePrice swap result correctly', () => {
			const mockDeltaSwap: DeltaPrice = {
				srcToken: '0x123',
				destToken: '0x456',
				srcAmount: '1000',
				destAmount: '900',
				destAmountBeforeFee: '920',
				gasCost: '50000',
				gasCostBeforeFee: '48000',
				gasCostUSD: '15.5',
				gasCostUSDBeforeFee: '14.8',
				srcUSD: '1000.0',
				destUSD: '895.5',
				destUSDBeforeFee: '915.2',
				partner: 'PartnerName',
				partnerFee: 0.25,
				hmac: 'abcd1234',
				bridge: {} as Bridge
			};
			const result = mapVeloraSwapResult(mockDeltaSwap);

			expect(result.provider).toBe(VELORA_SWAP_PROVIDER);
			expect(result.receiveAmount).toBe(800n);
			expect(result.swapDetails).toBe(mockDeltaSwap);
			expect(result.type).toBe(VeloraSwapTypes.DELTA);
		});
	});

	describe('mapVeloraMarketSwapResult', () => {
		it('should map OptimalRate result correctly', () => {
			const mockOptimalRate: OptimalRate = {
				blockNumber: 12345678,
				network: 1,
				srcToken: '0x123',
				srcDecimals: 18,
				srcAmount: '1000',
				srcUSD: '1000.0',
				destToken: '0x456',
				destDecimals: 6,
				destAmount: '950',
				destUSD: '0',
				bestRoute: [],
				gasCostUSD: '25.0',
				gasCost: '100000',
				side: 'SELL' as SwapSide,
				contractMethod: 'swapExactTokensForTokens',
				tokenTransferProxy: '0xproxy123',
				contractAddress: '0xcontract456',
				partner: 'ZeroPartner',
				partnerFee: 0,
				hmac: 'zero1234',
				version: '6.2' as OptimalRate['version']
			};

			const result = mapVeloraMarketSwapResult(mockOptimalRate);

			expect(result.provider).toBe(VELORA_SWAP_PROVIDER);
			expect(result.receiveAmount).toBe(950n);
			expect(result.swapDetails).toBe(mockOptimalRate);
			expect(result.type).toBe(VeloraSwapTypes.MARKET);
		});
	});

	describe('geSwapEthTokenAddress', () => {
		it('should return placeholder for default Ethereum token', () => {
			const result = geSwapEthTokenAddress(ETHEREUM_TOKEN as Erc20Token);

			expect(result).toBe(SWAP_ETH_TOKEN_PLACEHOLDER);
		});

		it('should return token address for ERC20 token', () => {
			const mockErc20Token = {
				...mockValidErc20Token,
				address: '0x1234567890abcdef'
			};

			const result = geSwapEthTokenAddress(mockErc20Token);

			expect(result).toBe('0x1234567890abcdef');
		});

		it('should return address for ERC20 token with different address format', () => {
			const mockErc20Token = {
				...mockValidErc20Token,
				address: '0xA0b86a33E6441038e7BC67766E6C6E57AF9E9C'
			};

			const result = geSwapEthTokenAddress(mockErc20Token);

			expect(result).toBe('0xA0b86a33E6441038e7BC67766E6C6E57AF9E9C');
		});
	});

	describe('isSwapError', () => {
		it('should return true if error is instance of SwapError', () => {
			const error = new SwapError(SwapErrorCodes.DEPOSIT_FAILED, 'Deposit failed');

			expect(isSwapError(error)).toBeTruthy();
		});

		it('should return false if error is not instance of SwapError', () => {
			const error = new Error('Generic error');

			expect(isSwapError(error)).toBeFalsy();
		});

		it('should return false for non-error values', () => {
			expect(isSwapError(null)).toBeFalsy();
			expect(isSwapError(undefined)).toBeFalsy();
			expect(isSwapError('string')).toBeFalsy();
			expect(isSwapError({ code: 'deposit_error' })).toBeFalsy();
		});
	});

	describe('getWithdrawableToken', () => {
		const sourceToken = {
			ledgerCanisterId: 'source-ledger-id',
			name: 'Source Token'
		} as IcTokenToggleable;

		const destinationToken = {
			ledgerCanisterId: 'destination-ledger-id',
			name: 'Destination Token'
		} as IcTokenToggleable;

		it('should return sourceToken if tokenAddress matches sourceToken.ledgerCanisterId', () => {
			const result = getWithdrawableToken({
				tokenAddress: 'source-ledger-id',
				sourceToken,
				destinationToken
			});

			expect(result).toBe(sourceToken);
		});

		it('should return destinationToken if tokenAddress matches destinationToken.ledgerCanisterId', () => {
			const result = getWithdrawableToken({
				tokenAddress: 'destination-ledger-id',
				sourceToken,
				destinationToken
			});

			expect(result).toBe(destinationToken);
		});

		it('should throw an error if tokenAddress matches neither', () => {
			expect(() =>
				getWithdrawableToken({
					tokenAddress: 'unknown-ledger-id',
					sourceToken,
					destinationToken
				})
			).toThrow('Unknown token address');
		});
	});

	describe('findSwapProviderDetails', () => {
		it('returns Velora provider details when given SwapProvider.VELORA', () => {
			const result = findSwapProvider(SwapProvider.VELORA);

			expect(result).include({
				id: 'velora',
				website: 'https://app.velora.xyz/',
				logo: '/images/dapps/velora-logo.svg'
			});
		});

		it('returns Velora provider details when given the string VELORA', () => {
			const result = findSwapProvider('VELORA');

			expect(result).include({
				id: 'velora',
				website: 'https://app.velora.xyz/',
				logo: '/images/dapps/velora-logo.svg'
			});
		});

		it('returns Kongswap provider details when given kongswap', () => {
			const result = findSwapProvider(SwapProvider.KONG_SWAP);

			expect(result).include({
				id: 'kongswap',
				logo: '/images/dapps/kong-swap-logo.svg',
				website: 'https://www.kongswap.io/'
			});
		});

		it('returns ICPSWAP provider details when given icpSwap', () => {
			const result = findSwapProvider(SwapProvider.ICP_SWAP);

			expect(result).include({
				id: 'icpswap',
				website: 'https://icpswap.com',
				logo: '/images/dapps/icp-swap-logo.svg'
			});
		});

		it('should return undefined if dapp is not found', () => {
			const result = findSwapProvider('test');

			expect(result).toBeUndefined();
		});
	});
});
