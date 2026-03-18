import type {
	SwapAmountsReply,
	SwapAmountsTxReply
} from '$declarations/kong_backend/kong_backend.did';
import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_SYMBOL, ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { Erc20Token } from '$eth/types/erc20';
import type { IcToken } from '$icp/types/ic-token';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import { ZERO } from '$lib/constants/app.constants';
import {
	SWAP_DEFAULT_SLIPPAGE_VALUE,
	SWAP_ETH_TOKEN_PLACEHOLDER
} from '$lib/constants/swap.constants';
import { SwapError } from '$lib/services/swap-errors.services';
import {
	SwapErrorCodes,
	SwapProvider,
	VeloraSwapTypes,
	type DeltaSwapResponse,
	type ICPSwapResult
} from '$lib/types/swap';
import { formatToken } from '$lib/utils/format.utils';
import {
	buildNearIntentsQuoteRequest,
	calculateSlippage,
	calculateValueDifference,
	findNearIntentsAsset,
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
	mapNearIntentsQuoteResult,
	mapVeloraMarketSwapResult,
	mapVeloraSwapResult,
	resolveNearIntentsBlockchain,
	resolveNearIntentsSwapAssets
} from '$lib/utils/swap.utils';
import { parseNetworkId } from '$lib/validation/network.validation';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import {
	mockNearIntentsQuoteResponse,
	mockNearIntentsTokens
} from '$tests/mocks/near-intents.mock';
import { mockTokens } from '$tests/mocks/tokens.mock';
import {
	mockVeloraBridgeSwapResponse,
	mockVeloraDeltaSwapResponse
} from '$tests/mocks/velora.mock';
import type { OptimalRate, SwapSide } from '@velora-dex/sdk';

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

		const mockDestToken: IcToken = {
			...mockValidIcToken,
			fee: 10n
		};

		it('should return mapped result with valid numeric slippage as string', () => {
			const result = mapIcpSwapResult({
				swap: baseSwap,
				slippage: '0.5',
				destToken: mockDestToken
			});

			expect(result.provider).toBe(SwapProvider.ICP_SWAP);

			assert(result.provider === SwapProvider.ICP_SWAP);

			expect(result.receiveAmount).toBe(990n);
			expect(result.receiveOutMinimum).toBe(
				calculateSlippage({ quoteAmount: 1000n, slippagePercentage: 0.5 })
			);
			expect(result.swapDetails).toBe(baseSwap);
		});

		it('should return mapped result with numeric slippage', () => {
			const result = mapIcpSwapResult({
				swap: baseSwap,
				slippage: 0.3,
				destToken: mockDestToken
			});

			assert(result.provider === SwapProvider.ICP_SWAP);

			expect(result.receiveAmount).toBe(990n);
			expect(result.receiveOutMinimum).toBe(
				calculateSlippage({ quoteAmount: 1000n, slippagePercentage: 0.3 })
			);
		});

		it('should fallback to default slippage if value is NaN', () => {
			const result = mapIcpSwapResult({
				swap: baseSwap,
				slippage: 'string',
				destToken: mockDestToken
			});

			assert(result.provider === SwapProvider.ICP_SWAP);

			expect(result.receiveOutMinimum).toBe(
				calculateSlippage({
					quoteAmount: 1000n,
					slippagePercentage: SWAP_DEFAULT_SLIPPAGE_VALUE
				})
			);
		});

		it('should fallback to default slippage if empty string is passed', () => {
			const result = mapIcpSwapResult({
				swap: baseSwap,
				slippage: '',
				destToken: mockDestToken
			});

			assert(result.provider === SwapProvider.ICP_SWAP);

			expect(result.receiveOutMinimum).toBe(
				calculateSlippage({
					quoteAmount: 1000n,
					slippagePercentage: SWAP_DEFAULT_SLIPPAGE_VALUE
				})
			);
		});

		it('should return 0 when receiveAmount is less than transfer fee', () => {
			const result = mapIcpSwapResult({
				swap: { receiveAmount: 5n },
				slippage: '0.5',
				destToken: { ...mockDestToken, fee: 10n }
			});

			expect(result.receiveAmount).toBe(ZERO);
		});

		it('should calculate NET amount correctly for typical swap', () => {
			const result = mapIcpSwapResult({
				swap: { receiveAmount: 1000000n },
				slippage: '0.5',
				destToken: { ...mockDestToken, fee: 10000n }
			});

			expect(result.receiveAmount).toBe(990000n);
		});

		it('should handle zero transfer fee', () => {
			const result = mapIcpSwapResult({
				swap: { receiveAmount: 1000n },
				slippage: '0.5',
				destToken: { ...mockDestToken, fee: ZERO }
			});

			expect(result.receiveAmount).toBe(1000n);
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

			expect(result.provider).toBe(SwapProvider.KONG_SWAP);

			assert(result.provider === SwapProvider.KONG_SWAP);

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
			expect(calculateSlippage({ quoteAmount: 12345n, slippagePercentage: 100 })).toBe(ZERO);
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
		it('should map DeltaPrice swap result correctly (without bridgeInfo)', () => {
			const mockDeltaSwap: DeltaSwapResponse = {
				...mockVeloraDeltaSwapResponse
			};

			const result = mapVeloraSwapResult(mockDeltaSwap);

			expect(result.provider).toBe(SwapProvider.VELORA);
			expect(result.receiveAmount).toBe(900n);
			expect(result.swapDetails).toBe(mockDeltaSwap.delta);
			expect(result.type).toBe(VeloraSwapTypes.DELTA);
		});

		it('should map BridgePrice swap result correctly (with bridgeInfo)', () => {
			const mockBridgeSwap: DeltaSwapResponse = {
				...mockVeloraBridgeSwapResponse
			};

			const result = mapVeloraSwapResult(mockBridgeSwap);

			expect(result.provider).toBe(SwapProvider.VELORA);
			expect(result.receiveAmount).toBe(800n);
			expect(result.swapDetails).toBe(mockBridgeSwap.delta);
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

			expect(result.provider).toBe(SwapProvider.VELORA);
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

	describe('calculateValueDifference', () => {
		it('should return positive percentage when received value is higher than paid', () => {
			const result = calculateValueDifference({
				swapAmount: 100,
				receiveAmount: 110,
				sourceTokenExchangeRate: 1,
				destinationTokenExchangeRate: 1
			});

			expect(result).toBe(10);
		});

		it('should return negative percentage when received value is lower than paid', () => {
			const result = calculateValueDifference({
				swapAmount: 100,
				receiveAmount: 90,
				sourceTokenExchangeRate: 1,
				destinationTokenExchangeRate: 1
			});

			expect(result).toBe(-10);
		});

		it('should return zero when paid and received values are equal', () => {
			const result = calculateValueDifference({
				swapAmount: 100,
				receiveAmount: 100,
				sourceTokenExchangeRate: 1,
				destinationTokenExchangeRate: 1
			});

			expect(result).toBe(0);
		});

		it('should calculate correctly with different exchange rates', () => {
			const result = calculateValueDifference({
				swapAmount: 100,
				receiveAmount: 50,
				sourceTokenExchangeRate: 2, // paid value = 200
				destinationTokenExchangeRate: 3 // received value = 150
			});

			// (150 - 200) / 200 * 100 = -25
			expect(result).toBe(-25);
		});

		it('should return undefined when swapAmount is undefined', () => {
			const result = calculateValueDifference({
				swapAmount: undefined,
				receiveAmount: 100,
				sourceTokenExchangeRate: 1,
				destinationTokenExchangeRate: 1
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined when receiveAmount is undefined', () => {
			const result = calculateValueDifference({
				swapAmount: 100,
				receiveAmount: undefined,
				sourceTokenExchangeRate: 1,
				destinationTokenExchangeRate: 1
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined when sourceTokenExchangeRate is undefined', () => {
			const result = calculateValueDifference({
				swapAmount: 100,
				receiveAmount: 100,
				sourceTokenExchangeRate: undefined,
				destinationTokenExchangeRate: 1
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined when destinationTokenExchangeRate is undefined', () => {
			const result = calculateValueDifference({
				swapAmount: 100,
				receiveAmount: 100,
				sourceTokenExchangeRate: 1,
				destinationTokenExchangeRate: undefined
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined when paid value is zero', () => {
			const result = calculateValueDifference({
				swapAmount: 100,
				receiveAmount: 100,
				sourceTokenExchangeRate: 0, // paid value will be 0
				destinationTokenExchangeRate: 1
			});

			expect(result).toBeUndefined();
		});

		it('should handle string swapAmount correctly', () => {
			const result = calculateValueDifference({
				swapAmount: '100',
				receiveAmount: 110,
				sourceTokenExchangeRate: 1,
				destinationTokenExchangeRate: 1
			});

			expect(result).toBe(10);
		});

		it('should calculate high precision percentages correctly', () => {
			const result = calculateValueDifference({
				swapAmount: 100,
				receiveAmount: 100.5,
				sourceTokenExchangeRate: 1,
				destinationTokenExchangeRate: 1
			});

			expect(result).toBe(0.5);
		});

		it('should return undefined when all values are undefined', () => {
			const result = calculateValueDifference({
				swapAmount: undefined,
				receiveAmount: undefined,
				sourceTokenExchangeRate: undefined,
				destinationTokenExchangeRate: undefined
			});

			expect(result).toBeUndefined();
		});
	});

	describe('mapNearIntentsQuoteResult', () => {
		it('should map quote response to SwapMappedResult', () => {
			const result = mapNearIntentsQuoteResult(mockNearIntentsQuoteResponse);

			expect(result).toStrictEqual({
				provider: SwapProvider.NEAR_INTENTS,
				receiveAmount: BigInt(mockNearIntentsQuoteResponse.quote.amountOut),
				receiveOutMinimum: BigInt(mockNearIntentsQuoteResponse.quote.minAmountOut ?? '0'),
				swapDetails: mockNearIntentsQuoteResponse
			});
		});

		it('should set receiveOutMinimum to undefined when minAmountOut is absent', () => {
			const quoteWithoutMin = {
				...mockNearIntentsQuoteResponse,
				quote: { ...mockNearIntentsQuoteResponse.quote, minAmountOut: undefined }
			};

			const result = mapNearIntentsQuoteResult(quoteWithoutMin);

			expect(result).toStrictEqual({
				provider: SwapProvider.NEAR_INTENTS,
				receiveAmount: BigInt(mockNearIntentsQuoteResponse.quote.amountOut),
				receiveOutMinimum: undefined,
				swapDetails: quoteWithoutMin
			});
		});
	});

	describe('resolveNearIntentsBlockchain', () => {
		it('should resolve Ethereum network to eth', () => {
			expect(resolveNearIntentsBlockchain(ETHEREUM_NETWORK.id)).toBe('eth');
		});

		it('should resolve Arbitrum network to arb', () => {
			expect(resolveNearIntentsBlockchain(ARBITRUM_MAINNET_NETWORK.id)).toBe('arb');
		});

		it('should return undefined for unsupported network', () => {
			expect(resolveNearIntentsBlockchain(parseNetworkId('UNSUPPORTED'))).toBeUndefined();
		});
	});

	describe('findNearIntentsAsset', () => {
		it('should find an ERC20 token by contract address', () => {
			const token: Erc20Token = {
				...mockValidErc20Token,
				address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
			};

			const result = findNearIntentsAsset({
				tokens: mockNearIntentsTokens,
				token,
				blockchain: 'eth'
			});

			expect(result).toStrictEqual(mockNearIntentsTokens[0]);
		});

		it('should find a native token by symbol', () => {
			const token: Erc20Token = {
				...mockValidErc20Token,
				symbol: 'ETH',
				address: '0x0000000000000000000000000000000000000000'
			};

			const result = findNearIntentsAsset({
				tokens: mockNearIntentsTokens,
				token,
				blockchain: 'eth'
			});

			expect(result).toStrictEqual(mockNearIntentsTokens[1]);
		});

		it('should return undefined when no matching token is found', () => {
			const token: Erc20Token = {
				...mockValidErc20Token,
				address: '0xUnknownAddress'
			};

			const result = findNearIntentsAsset({
				tokens: mockNearIntentsTokens,
				token,
				blockchain: 'eth'
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined when blockchain does not match', () => {
			const token: Erc20Token = {
				...mockValidErc20Token,
				address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
			};

			const result = findNearIntentsAsset({
				tokens: mockNearIntentsTokens,
				token,
				blockchain: 'arb'
			});

			expect(result).toBeUndefined();
		});
	});

	describe('resolveNearIntentsSwapAssets', () => {
		const sourceToken: Erc20Token = {
			...mockValidErc20Token,
			network: ETHEREUM_NETWORK,
			address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
		};

		const destinationToken: Erc20Token = {
			...mockValidErc20Token,
			network: ARBITRUM_MAINNET_NETWORK,
			address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831'
		};

		it('should resolve both source and destination assets', () => {
			const result = resolveNearIntentsSwapAssets({
				nearTokens: mockNearIntentsTokens,
				sourceToken,
				destinationToken
			});

			expect(result).toStrictEqual({
				srcAsset: mockNearIntentsTokens[0],
				destAsset: mockNearIntentsTokens[2]
			});
		});

		it('should return undefined when source blockchain is unsupported', () => {
			const unsupportedSource: Erc20Token = {
				...sourceToken,
				network: { ...sourceToken.network, id: parseNetworkId('UNSUPPORTED') }
			};

			const result = resolveNearIntentsSwapAssets({
				nearTokens: mockNearIntentsTokens,
				sourceToken: unsupportedSource,
				destinationToken
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined when destination blockchain is unsupported', () => {
			const unsupportedDest: Erc20Token = {
				...destinationToken,
				network: { ...destinationToken.network, id: parseNetworkId('UNSUPPORTED') }
			};

			const result = resolveNearIntentsSwapAssets({
				nearTokens: mockNearIntentsTokens,
				sourceToken,
				destinationToken: unsupportedDest
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined when source token is not found in NEAR tokens', () => {
			const unknownSource: Erc20Token = {
				...sourceToken,
				address: '0xUnknownAddress'
			};

			const result = resolveNearIntentsSwapAssets({
				nearTokens: mockNearIntentsTokens,
				sourceToken: unknownSource,
				destinationToken
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined when destination token is not found in NEAR tokens', () => {
			const unknownDest: Erc20Token = {
				...destinationToken,
				address: '0xUnknownAddress'
			};

			const result = resolveNearIntentsSwapAssets({
				nearTokens: mockNearIntentsTokens,
				sourceToken,
				destinationToken: unknownDest
			});

			expect(result).toBeUndefined();
		});
	});

	describe('buildNearIntentsQuoteRequest', () => {
		const [srcAsset, , destAsset] = mockNearIntentsTokens;

		it('should build a quote request with all required fields', () => {
			const result = buildNearIntentsQuoteRequest({
				slippageTolerance: 150,
				srcAsset,
				destAsset,
				amount: 1_000_000n,
				userEthAddress: mockEthAddress,
				deadlineMs: 180_000
			});

			expect(result).toStrictEqual({
				dry: false,
				swapType: 'EXACT_INPUT',
				slippageTolerance: 150,
				originAsset: srcAsset.assetId,
				depositType: 'ORIGIN_CHAIN',
				destinationAsset: destAsset.assetId,
				amount: '1000000',
				recipient: mockEthAddress,
				recipientType: 'DESTINATION_CHAIN',
				refundTo: mockEthAddress,
				refundType: 'ORIGIN_CHAIN',
				deadline: expect.any(String)
			});
		});

		it('should set deadline as ISO string in the future', () => {
			const before = Date.now();

			const result = buildNearIntentsQuoteRequest({
				slippageTolerance: 100,
				srcAsset,
				destAsset,
				amount: 1_000_000n,
				userEthAddress: mockEthAddress,
				deadlineMs: 180_000
			});

			const deadlineTime = new Date(result.deadline).getTime();

			expect(deadlineTime).toBeGreaterThanOrEqual(before + 180_000);
		});
	});
});
