import { BSC_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { USDC_TOKEN as BASE_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.usdc.env';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { USDC_TOKEN as BSC_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens-bep20/tokens.usdc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { VELORA_AUGUSTUS_SELL_ABI } from '$eth/constants/velora.constants';
import type { Erc20Token } from '$eth/types/erc20';
import { ZERO, ZERO_ETH_ADDRESS } from '$lib/constants/app.constants';
import { SWAP_ETH_TOKEN_PLACEHOLDER } from '$lib/constants/swap.constants';
import { VeloraSwapRejectedError } from '$lib/types/errors';
import {
	assertVeloraDeltaOrder,
	assertVeloraDeltaRoute,
	assertVeloraMarketTransaction,
	veloraBridgeableTokenAddresses,
	veloraMinimumAmount
} from '$lib/utils/velora-swap.utils';
import type { DeltaAuctionOrder, DeltaRoute, TransactionParams } from '@velora-dex/sdk';
import { Interface } from 'ethers/abi';

const WALLET = '0x5a52e96bacdabb82fd05763e25335261b270efcb';
const OTHER = '0x1111111111111111111111111111111111111111';
const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const DAI = '0x6b175474e89094c44da98b954eedeac495271d0f';
const USDC_BASE = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const USDC_BSC = '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d';
const AUGUSTUS = '0x6a000f20005980200259b80c5102003040001068';
const NO_METADATA = `0x${'00'.repeat(32)}`;

// The surplus cap Velora sets on OISY's Delta orders (`FeeManagerLib.CAP_SURPLUS_MASK`) and Market
// transactions (`AugustusFees.IS_CAP_SURPLUS_MASK`).
const DELTA_CAP_SURPLUS = 1n << 9n;
const AUGUSTUS_CAP_SURPLUS = 1n << 92n;

const augustus = new Interface(VELORA_AUGUSTUS_SELL_ABI);

const balancerVault = new Interface([
	'function swap(tuple(bytes32 poolId, uint8 kind, address assetIn, address assetOut, uint256 amount, bytes userData) singleSwap, tuple(address sender, bool fromInternalBalance, address recipient, bool toInternalBalance) funds, uint256 limit, uint256 deadline)',
	'function batchSwap(uint8 kind, tuple(bytes32 poolId, uint256 assetInIndex, uint256 assetOutIndex, uint256 amount, bytes userData)[] swaps, address[] assets, tuple(address sender, bool fromInternalBalance, address recipient, bool toInternalBalance) funds, int256[] limits, uint256 deadline)'
]);

describe('velora-swap.utils', () => {
	describe('veloraMinimumAmount', () => {
		it.each([
			// Minimums Velora built on 2026-10-23: a Delta order and a Market transaction at 1%.
			{ amount: 41589349059580101n, slippageBasisPoints: 100, minimum: 41173455568984299n },
			{ amount: 41678164195771634n, slippageBasisPoints: 100, minimum: 41261382553813917n },
			{ amount: 900000000n, slippageBasisPoints: 50, minimum: 895500000n }
		])(
			'matches the minimum Velora signs for $amount at $slippageBasisPoints bps',
			({ amount, slippageBasisPoints, minimum }) => {
				expect(veloraMinimumAmount({ amount, slippageBasisPoints })).toBe(minimum);
			}
		);
	});

	describe('Delta', () => {
		// The route and order Velora returned on 2026-10-23 for 100 USDC to WETH on Ethereum.
		const sameChainRoute: DeltaRoute = {
			origin: {
				input: { token: { chainId: 1, address: USDC }, amount: '100000000', amountUSD: '99.95' },
				output: {
					token: { chainId: 1, address: WETH },
					amount: '41589349059580101',
					amountUSD: '99.86'
				}
			},
			destination: {
				input: {
					token: { chainId: 1, address: WETH },
					amount: '41589349059580101',
					amountUSD: '99.86'
				},
				output: {
					token: { chainId: 1, address: WETH },
					amount: '41589349059580101',
					amountUSD: '99.86'
				}
			},
			bridge: null,
			fees: {
				gas: {
					token: { chainId: 1, address: SWAP_ETH_TOKEN_PLACEHOLDER },
					amount: '307240',
					amountUSD: '0.23'
				},
				bridge: []
			}
		};

		const sameChainOrder: DeltaAuctionOrder = {
			owner: WALLET,
			beneficiary: ZERO_ETH_ADDRESS,
			srcToken: USDC,
			destToken: WETH,
			srcAmount: '100000000',
			destAmount: '41173455568984299',
			expectedAmount: '41589349059580101',
			deadline: 1792766290,
			kind: 0,
			nonce: '46044960915549323991956273295755817914487262528810318179194073118678599606439',
			permit: '0x',
			partnerAndFee: '512',
			metadata: '0x',
			bridge: {
				protocolSelector: '0x00000000',
				destinationChainId: 0,
				outputToken: ZERO_ETH_ADDRESS,
				protocolData: '0x',
				scalingFactor: 0
			}
		};

		const crossChainBridge: NonNullable<DeltaRoute['bridge']> = {
			protocol: 'Across',
			estimatedTimeMs: 2000,
			tags: ['recommended', 'best-return'],
			contractParams: {
				protocolSelector: '0x2e09f389',
				outputToken: USDC_BASE,
				scalingFactor: 0,
				protocolData: `0x${'00'.repeat(62)}6bde`
			}
		};

		// The route Velora returned on 2026-11-05 for 100 USDC on Ethereum to USDC on Base.
		const crossChainRoute: DeltaRoute = {
			origin: {
				input: { token: { chainId: 1, address: USDC }, amount: '100000000', amountUSD: '99.95' },
				output: { token: { chainId: 1, address: USDC }, amount: '99892993', amountUSD: '99.84' }
			},
			destination: {
				input: {
					token: { chainId: 8453, address: USDC_BASE },
					amount: '99879162',
					amountUSD: '99.83'
				},
				output: {
					token: { chainId: 8453, address: USDC_BASE },
					amount: '99879162',
					amountUSD: '99.83'
				}
			},
			bridge: crossChainBridge,
			fees: {
				gas: {
					token: { chainId: 1, address: SWAP_ETH_TOKEN_PLACEHOLDER },
					amount: '260000',
					amountUSD: '0.11'
				},
				bridge: [{ token: { chainId: 8453, address: USDC }, amount: '13807', amountUSD: '0.01' }]
			}
		};

		// An order for that route at 1% slippage.
		const crossChainOrder: DeltaAuctionOrder = {
			...sameChainOrder,
			destToken: USDC,
			destAmount: '98894063',
			expectedAmount: '99892993',
			bridge: { ...crossChainBridge.contractParams, destinationChainId: 8453 }
		};

		describe('assertVeloraDeltaRoute', () => {
			const params = {
				route: sameChainRoute,
				sourceTokenAddress: USDC,
				sourceChainId: 1n,
				destinationTokenAddress: WETH,
				destinationChainId: 1n,
				bridgeableTokenAddresses: [] as string[],
				amount: 100000000n
			};

			it('accepts the route Velora quoted', () => {
				expect(() => assertVeloraDeltaRoute(params)).not.toThrow();
			});

			it('accepts a cross-chain route with its bridge', () => {
				expect(() =>
					assertVeloraDeltaRoute({
						...params,
						route: crossChainRoute,
						destinationTokenAddress: USDC_BASE,
						destinationChainId: 8453n,
						bridgeableTokenAddresses: [USDC]
					})
				).not.toThrow();
			});

			it.each([
				{
					case: 'another source token',
					change: { sourceTokenAddress: DAI },
					reason: 'does not sell'
				},
				{
					case: 'another source network',
					change: { sourceChainId: 8453n },
					reason: 'does not sell'
				},
				{ case: 'another amount', change: { amount: 100000001n }, reason: 'does not sell' },
				{
					case: 'another destination token',
					change: { destinationTokenAddress: DAI },
					reason: 'does not buy'
				},
				{
					case: 'another destination network',
					change: { destinationChainId: 8453n },
					reason: 'does not buy'
				},
				{
					case: 'a same-chain route that shows more than it settles',
					change: {
						route: {
							...sameChainRoute,
							origin: {
								...sameChainRoute.origin,
								output: { ...sameChainRoute.origin.output, amount: '99' }
							}
						}
					},
					reason: 'settles another amount'
				},
				{
					case: 'a same-chain route with a bridge',
					change: { route: { ...sameChainRoute, bridge: crossChainRoute.bridge } },
					reason: 'settles another amount'
				},
				{
					case: 'a cross-chain route without a bridge',
					change: {
						route: { ...crossChainRoute, bridge: null },
						destinationTokenAddress: USDC_BASE,
						destinationChainId: 8453n
					},
					reason: 'has no bridge'
				}
			])('refuses $case', ({ change, reason }) => {
				expect(() => assertVeloraDeltaRoute({ ...params, ...change })).toThrow(reason);
			});

			describe('bridged to the destination', () => {
				const crossChainParams = {
					...params,
					route: crossChainRoute,
					destinationTokenAddress: USDC_BASE,
					destinationChainId: 8453n,
					bridgeableTokenAddresses: [USDC]
				};

				const scaledBridge: NonNullable<DeltaRoute['bridge']> = {
					...crossChainBridge,
					contractParams: {
						...crossChainBridge.contractParams,
						scalingFactor: -12,
						protocolData: `0x${'00'.repeat(57)}62d1bd6f2b9d5c`
					}
				};

				// The route Velora returned on 2026-11-05 for 100 USDC on BSC (18 decimals) to USDC on
				// Base (6 decimals): the bridge scales the origin output by 10^-12.
				const scaledRoute: DeltaRoute = {
					origin: {
						input: {
							token: { chainId: 56, address: USDC_BSC },
							amount: '100000000000000000000',
							amountUSD: '99.95'
						},
						output: {
							token: { chainId: 56, address: USDC_BSC },
							amount: '99990136018689438167',
							amountUSD: '99.94'
						}
					},
					destination: {
						input: {
							token: { chainId: 8453, address: USDC_BASE },
							amount: '99976189',
							amountUSD: '99.93'
						},
						output: {
							token: { chainId: 8453, address: USDC_BASE },
							amount: '99976189',
							amountUSD: '99.93'
						}
					},
					bridge: scaledBridge,
					fees: {
						gas: {
							token: { chainId: 56, address: SWAP_ETH_TOKEN_PLACEHOLDER },
							amount: '260000',
							amountUSD: '0.01'
						},
						bridge: [
							{
								token: { chainId: 8453, address: USDC_BSC },
								amount: '13907579630898862',
								amountUSD: '0.01'
							}
						]
					}
				};

				const scaledParams = {
					...crossChainParams,
					route: scaledRoute,
					sourceTokenAddress: USDC_BSC,
					sourceChainId: 56n,
					bridgeableTokenAddresses: [USDC_BSC],
					amount: 100000000000000000000n
				};

				const showing = ({ route, amount }: { route: DeltaRoute; amount: string }): DeltaRoute => ({
					...route,
					destination: {
						input: { ...route.destination.input, amount },
						output: { ...route.destination.output, amount }
					}
				});

				const bridgingWith = ({
					route,
					bridge,
					contractParams
				}: {
					route: DeltaRoute;
					bridge: NonNullable<DeltaRoute['bridge']>;
					contractParams: Partial<NonNullable<DeltaRoute['bridge']>['contractParams']>;
				}): DeltaRoute => ({
					...route,
					bridge: { ...bridge, contractParams: { ...bridge.contractParams, ...contractParams } }
				});

				it('accepts the route Velora quoted from BSC to Base, scaled by the bridge', () => {
					expect(() => assertVeloraDeltaRoute(scaledParams)).not.toThrow();
				});

				it('accepts an amount shown up to the origin output once scaled', () => {
					// 99990136018689438167 at 10^-12, rounded down.
					expect(() =>
						assertVeloraDeltaRoute({
							...scaledParams,
							route: showing({ route: scaledRoute, amount: '99990136' })
						})
					).not.toThrow();
				});

				it.each([
					{
						// A route that buys another token on the source network, its minimum then counted
						// in that token.
						case: 'a bridge from a token OISY does not group with the reviewed one',
						change: {
							route: {
								...crossChainRoute,
								origin: {
									...crossChainRoute.origin,
									output: {
										token: { chainId: 1, address: DAI },
										amount: '999999999999999999999',
										amountUSD: '0'
									}
								}
							}
						},
						reason: 'bridges a token OISY does not group with the reviewed one'
					},
					{
						case: 'a bridge from the grouped token on another network',
						change: {
							route: {
								...crossChainRoute,
								origin: {
									...crossChainRoute.origin,
									output: {
										...crossChainRoute.origin.output,
										token: { chainId: 8453, address: USDC }
									}
								}
							}
						},
						reason: 'bridges a token OISY does not group with the reviewed one'
					},
					{
						case: 'a bridge with a scaling factor outside int8',
						change: {
							route: bridgingWith({
								route: crossChainRoute,
								bridge: crossChainBridge,
								contractParams: { scalingFactor: 200 }
							})
						},
						reason: 'the bridge cannot be signed'
					},
					{
						case: 'a bridge with a 2-byte protocol selector',
						change: {
							route: bridgingWith({
								route: crossChainRoute,
								bridge: crossChainBridge,
								contractParams: { protocolSelector: '0x1234' }
							})
						},
						reason: 'the bridge cannot be signed'
					},
					{
						case: 'a bridge with protocol data that is not hex',
						change: {
							route: bridgingWith({
								route: crossChainRoute,
								bridge: crossChainBridge,
								contractParams: { protocolData: 'xyz' }
							})
						},
						reason: 'the bridge cannot be signed'
					},
					{
						case: 'a bridge to another token',
						change: {
							route: bridgingWith({
								route: crossChainRoute,
								bridge: crossChainBridge,
								contractParams: { outputToken: OTHER }
							})
						},
						reason: 'does not deliver the reviewed token'
					},
					{
						case: 'an amount shown above the origin output',
						change: { route: showing({ route: crossChainRoute, amount: '99892994' }) },
						reason: 'shows more than its bridge delivers'
					},
					{
						case: 'an amount shown above the origin output once scaled',
						change: { ...scaledParams, route: showing({ route: scaledRoute, amount: '99990137' }) },
						reason: 'shows more than its bridge delivers'
					},
					{
						case: 'a bridge that scales the origin output below the amount shown',
						change: {
							...scaledParams,
							route: bridgingWith({
								route: scaledRoute,
								bridge: scaledBridge,
								contractParams: { scalingFactor: -13 }
							})
						},
						reason: 'shows more than its bridge delivers'
					}
				])('refuses $case', ({ change, reason }) => {
					expect(() => assertVeloraDeltaRoute({ ...crossChainParams, ...change })).toThrow(reason);
				});
			});
		});

		describe('veloraBridgeableTokenAddresses', () => {
			const tokens = [ETHEREUM_TOKEN, USDC_TOKEN, BSC_USDC_TOKEN, BASE_USDC_TOKEN, BASE_ETH_TOKEN];

			it.each([
				{
					case: 'USDC on Ethereum for USDC on Base',
					sourceNetworkId: ETHEREUM_NETWORK_ID,
					destinationToken: BASE_USDC_TOKEN,
					expected: [USDC_TOKEN.address]
				},
				{
					case: 'USDC on BSC for USDC on Base',
					sourceNetworkId: BSC_MAINNET_NETWORK_ID,
					destinationToken: BASE_USDC_TOKEN,
					expected: [BSC_USDC_TOKEN.address]
				},
				{
					case: 'ETH on Ethereum, by the placeholder, for ETH on Base',
					sourceNetworkId: ETHEREUM_NETWORK_ID,
					destinationToken: BASE_ETH_TOKEN,
					expected: [SWAP_ETH_TOKEN_PLACEHOLDER]
				}
			])('names $case', ({ sourceNetworkId, destinationToken, expected }) => {
				expect(
					veloraBridgeableTokenAddresses({ tokens, sourceNetworkId, destinationToken })
				).toEqual(expected);
			});

			it('leaves out a custom token in the same group', () => {
				const customUsdc: Erc20Token = { ...USDC_TOKEN, address: OTHER, category: 'custom' };

				expect(
					veloraBridgeableTokenAddresses({
						tokens: [customUsdc],
						sourceNetworkId: ETHEREUM_NETWORK_ID,
						destinationToken: BASE_USDC_TOKEN
					})
				).toEqual([]);
			});

			it('names none for a destination token in no group', () => {
				expect(
					veloraBridgeableTokenAddresses({
						tokens,
						sourceNetworkId: ETHEREUM_NETWORK_ID,
						destinationToken: { ...BASE_USDC_TOKEN, groupData: undefined }
					})
				).toEqual([]);
			});
		});

		describe('assertVeloraDeltaOrder', () => {
			const params = {
				order: sameChainOrder,
				route: sameChainRoute,
				wallet: WALLET,
				amount: 100000000n,
				permit: '0x',
				feePercent: 0,
				destinationChainId: 1n
			};

			it('accepts the order Velora built, paid to its owner by a zero beneficiary', () => {
				expect(() => assertVeloraDeltaOrder(params)).not.toThrow();
			});

			it('accepts an order naming the wallet as beneficiary', () => {
				expect(() =>
					assertVeloraDeltaOrder({ ...params, order: { ...sameChainOrder, beneficiary: WALLET } })
				).not.toThrow();
			});

			it('accepts a partner fee up to the quoted one', () => {
				expect(() =>
					assertVeloraDeltaOrder({
						...params,
						order: { ...sameChainOrder, partnerAndFee: `${(1n << 96n) | DELTA_CAP_SURPLUS | 25n}` },
						feePercent: 0.25
					})
				).not.toThrow();
			});

			it.each([
				{ feePercent: 0.125, fee: 12n },
				{ feePercent: 0.29, fee: 29n }
			])('accepts $fee basis points on a quote of $feePercent percent', ({ feePercent, fee }) => {
				expect(() =>
					assertVeloraDeltaOrder({
						...params,
						order: { ...sameChainOrder, partnerAndFee: `${(1n << 96n) | DELTA_CAP_SURPLUS | fee}` },
						feePercent
					})
				).not.toThrow();
			});

			it('refuses 13 basis points on a quote of 0.125 percent', () => {
				expect(() =>
					assertVeloraDeltaOrder({
						...params,
						order: { ...sameChainOrder, partnerAndFee: `${(1n << 96n) | DELTA_CAP_SURPLUS | 13n}` },
						feePercent: 0.125
					})
				).toThrow('partner fee');
			});

			it('accepts a cross-chain order carrying the route bridge', () => {
				expect(() =>
					assertVeloraDeltaOrder({
						...params,
						order: crossChainOrder,
						route: crossChainRoute,
						destinationChainId: 8453n
					})
				).not.toThrow();
			});

			it.each([
				{ case: 'another owner', order: { owner: OTHER }, reason: 'not paid to the wallet' },
				{
					case: 'another beneficiary',
					order: { beneficiary: OTHER },
					reason: 'not paid to the wallet'
				},
				{ case: 'a buy order', order: { kind: 1 }, reason: 'does not sell' },
				{ case: 'another source token', order: { srcToken: DAI }, reason: 'does not sell' },
				{ case: 'another destination token', order: { destToken: DAI }, reason: 'does not sell' },
				{ case: 'another amount', order: { srcAmount: '100000001' }, reason: 'does not sell' },
				{
					case: 'a permit OISY did not sign',
					order: { permit: '0xabcd' },
					reason: 'another permit'
				},
				{
					case: 'a partner fee above the quoted one',
					order: { partnerAndFee: '1' },
					reason: 'partner fee'
				},
				{
					case: 'a bridge on a same-chain route',
					order: { bridge: crossChainOrder.bridge },
					reason: 'bridges other than the route'
				},
				{
					case: 'a partner taking the surplus',
					order: { partnerAndFee: `${DELTA_CAP_SURPLUS | (1n << 8n)}` },
					reason: 'gives a partner the surplus'
				},
				{
					case: 'an uncapped surplus',
					order: { partnerAndFee: '0' },
					reason: 'does not cap the surplus'
				},
				{
					case: 'a surplus measured from less than the route',
					order: { expectedAmount: '41589349059580100' },
					reason: 'measures the surplus from less than its route'
				}
			])('refuses $case', ({ order, reason }) => {
				expect(() =>
					assertVeloraDeltaOrder({
						...params,
						order: { ...sameChainOrder, ...order } as DeltaAuctionOrder
					})
				).toThrow(reason);
			});

			it.each([
				{ case: 'other protocol data', bridge: { protocolData: '0xbeef' } },
				{ case: 'another destination network', bridge: { destinationChainId: 10 } },
				{ case: 'another output token', bridge: { outputToken: OTHER } }
			])('refuses a cross-chain order with $case than the route', ({ bridge }) => {
				expect(() =>
					assertVeloraDeltaOrder({
						...params,
						order: { ...crossChainOrder, bridge: { ...crossChainOrder.bridge, ...bridge } },
						route: crossChainRoute,
						destinationChainId: 8453n
					})
				).toThrow('bridges other than the route');
			});
		});
	});

	describe('assertVeloraMarketTransaction', () => {
		const amount = 100000000n;
		const minimum = 41261382553813917n;

		const swapData = {
			srcToken: USDC,
			destToken: WETH,
			fromAmount: amount,
			toAmount: minimum,
			quotedAmount: 41678164195771634n,
			metadata: NO_METADATA,
			beneficiary: ZERO_ETH_ADDRESS
		};

		// The transaction Velora built on 2026-10-23 for 100 USDC to WETH on Ethereum at 1%.
		const veloraTransaction: TransactionParams = {
			from: WALLET,
			to: AUGUSTUS,
			value: '0',
			chainId: 1,
			data: '0x876a02f60000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000001e0000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000000000000000000000000000005f5e10000000000000000000000000000000000000000000000000000929702420fc39d00000000000000000000000000000000000000000000000000941211cbc784f244113e38121d4607bb4b10ce2d2700050000000000000000000000000190a12f000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000060800000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc200000000000000000000000000000000000000000000000000000000000000640000000000000000000000000000000000000000000000000000000000000000'
		};

		const params = {
			transaction: veloraTransaction,
			augustusAddress: AUGUSTUS,
			sourceChainId: 1n,
			srcToken: USDC,
			destToken: WETH,
			amount,
			isNativeSource: false,
			minimum,
			quotedAmount: swapData.quotedAmount,
			feePercent: 0,
			wallet: WALLET
		};

		const withData = (data: string): typeof params => ({
			...params,
			transaction: { ...veloraTransaction, data }
		});

		it('accepts the transaction Velora built', () => {
			expect(() => assertVeloraMarketTransaction(params)).not.toThrow();
		});

		it.each([
			{ case: 'another contract', transaction: { to: OTHER } },
			{ case: 'another network', transaction: { chainId: 8453 } },
			{ case: 'native value on a token sale', transaction: { value: '1' } }
		])('refuses a call to $case', ({ transaction }) => {
			expect(() =>
				assertVeloraMarketTransaction({
					...params,
					transaction: { ...veloraTransaction, ...transaction }
				})
			).toThrow(VeloraSwapRejectedError);
		});

		it('requires a native sale to send exactly its amount', () => {
			const data = augustus.encodeFunctionData('swapExactAmountIn', [
				OTHER,
				{ ...swapData, srcToken: SWAP_ETH_TOKEN_PLACEHOLDER },
				AUGUSTUS_CAP_SURPLUS,
				'0x',
				'0x'
			]);
			const native = {
				...withData(data),
				srcToken: SWAP_ETH_TOKEN_PLACEHOLDER,
				isNativeSource: true
			};

			expect(() =>
				assertVeloraMarketTransaction({
					...native,
					transaction: { ...native.transaction, value: `${amount}` }
				})
			).not.toThrow();
			expect(() => assertVeloraMarketTransaction(native)).toThrow(VeloraSwapRejectedError);
		});

		interface Sale {
			data: typeof swapData;
			fee?: bigint;
		}

		describe.each([
			{
				name: 'swapExactAmountIn',
				encode: ({ data, fee = AUGUSTUS_CAP_SURPLUS }: Sale) =>
					augustus.encodeFunctionData('swapExactAmountIn', [OTHER, data, fee, '0x', '0x'])
			},
			{
				name: 'swapExactAmountInOnUniswapV2',
				encode: ({ data, fee = AUGUSTUS_CAP_SURPLUS }: Sale) =>
					augustus.encodeFunctionData('swapExactAmountInOnUniswapV2', [
						{ ...data, pools: '0x' },
						fee,
						'0x'
					])
			},
			{
				name: 'swapExactAmountInOnCurveV1',
				encode: ({ data, fee = AUGUSTUS_CAP_SURPLUS }: Sale) =>
					augustus.encodeFunctionData('swapExactAmountInOnCurveV1', [
						{ curveData: ZERO, curveAssets: ZERO, ...data },
						fee,
						'0x'
					])
			},
			{
				name: 'swapExactAmountInOnCurveV2',
				encode: ({ data, fee = AUGUSTUS_CAP_SURPLUS }: Sale) =>
					augustus.encodeFunctionData('swapExactAmountInOnCurveV2', [
						{ curveData: ZERO, i: ZERO, j: 1n, poolAddress: OTHER, ...data },
						fee,
						'0x'
					])
			}
		])('$name', ({ encode }) => {
			it('accepts a sale to the wallet', () => {
				expect(() =>
					assertVeloraMarketTransaction(withData(encode({ data: swapData })))
				).not.toThrow();
				expect(() =>
					assertVeloraMarketTransaction(
						withData(encode({ data: { ...swapData, beneficiary: WALLET } }))
					)
				).not.toThrow();
			});

			it.each([
				{ case: 'another beneficiary', change: { beneficiary: OTHER }, reason: 'not paid' },
				{ case: 'another source token', change: { srcToken: DAI }, reason: 'does not sell' },
				{ case: 'another destination token', change: { destToken: DAI }, reason: 'does not sell' },
				{ case: 'another amount', change: { fromAmount: amount + 1n }, reason: 'does not sell' }
			])('refuses $case', ({ change, reason }) => {
				expect(() =>
					assertVeloraMarketTransaction(withData(encode({ data: { ...swapData, ...change } })))
				).toThrow(reason);
			});

			it('refuses a partner fee above the quoted one', () => {
				expect(() =>
					assertVeloraMarketTransaction(
						withData(encode({ data: swapData, fee: AUGUSTUS_CAP_SURPLUS | 1n }))
					)
				).toThrow('partner fee');
			});

			it('refuses a minimum below the reviewed one as exceeded slippage', () => {
				expect(() =>
					assertVeloraMarketTransaction(
						withData(encode({ data: { ...swapData, toAmount: minimum - 1n } }))
					)
				).toThrow('Slippage exceeded.');
			});
		});

		describe('the surplus terms', () => {
			const selling = ({
				partnerAndFee = AUGUSTUS_CAP_SURPLUS,
				quotedAmount = swapData.quotedAmount
			}: {
				partnerAndFee?: bigint;
				quotedAmount?: bigint;
			}) =>
				withData(
					augustus.encodeFunctionData('swapExactAmountIn', [
						OTHER,
						{ ...swapData, quotedAmount },
						partnerAndFee,
						'0x',
						'0x'
					])
				);

			it('accepts a surplus measured from more than the quote', () => {
				expect(() =>
					assertVeloraMarketTransaction(selling({ quotedAmount: swapData.quotedAmount + 1n }))
				).not.toThrow();
			});

			it.each([
				{
					case: 'a partner taking the surplus',
					partnerAndFee: AUGUSTUS_CAP_SURPLUS | (1n << 95n),
					reason: 'gives a partner the surplus'
				},
				{
					case: 'a referral share of the surplus',
					partnerAndFee: AUGUSTUS_CAP_SURPLUS | (1n << 94n),
					reason: 'gives a partner the surplus'
				},
				{ case: 'an uncapped surplus', partnerAndFee: ZERO, reason: 'does not cap the surplus' },
				{
					case: 'a surplus measured from less than the quote',
					quotedAmount: swapData.quotedAmount - 1n,
					reason: 'measures the surplus from less than the quote'
				}
			])('refuses $case', ({ partnerAndFee, quotedAmount, reason }) => {
				expect(() =>
					assertVeloraMarketTransaction(selling({ partnerAndFee, quotedAmount }))
				).toThrow(reason);
			});
		});

		describe('a partner fee between two basis points', () => {
			const charging = ({ fee, feePercent }: { fee: bigint; feePercent: number }) => ({
				...withData(
					augustus.encodeFunctionData('swapExactAmountIn', [
						OTHER,
						swapData,
						AUGUSTUS_CAP_SURPLUS | fee,
						'0x',
						'0x'
					])
				),
				feePercent
			});

			it.each([
				{ feePercent: 0.125, fee: 12n },
				{ feePercent: 0.29, fee: 29n }
			])('accepts $fee basis points on a quote of $feePercent percent', ({ feePercent, fee }) => {
				expect(() => assertVeloraMarketTransaction(charging({ fee, feePercent }))).not.toThrow();
			});

			it('refuses 13 basis points on a quote of 0.125 percent', () => {
				expect(() =>
					assertVeloraMarketTransaction(charging({ fee: 13n, feePercent: 0.125 }))
				).toThrow('partner fee');
			});
		});

		describe('swapExactAmountInOnBalancerV2', () => {
			const funds = {
				sender: AUGUSTUS,
				fromInternalBalance: false,
				recipient: AUGUSTUS,
				toInternalBalance: false
			};

			const single = ({ assetIn, assetOut }: { assetIn: string; assetOut: string }): string =>
				balancerVault.encodeFunctionData('swap', [
					{ poolId: NO_METADATA, kind: 0, assetIn, assetOut, amount, userData: '0x' },
					funds,
					minimum,
					1n
				]);

			const batch = ({ kind, assets }: { kind: number; assets: string[] }): string =>
				balancerVault.encodeFunctionData('batchSwap', [
					kind,
					[],
					assets,
					funds,
					assets.map(() => ZERO),
					1n
				]);

			const encode = ({
				vaultCall,
				beneficiary = WALLET,
				partnerAndFee = AUGUSTUS_CAP_SURPLUS
			}: {
				vaultCall: string;
				beneficiary?: string;
				partnerAndFee?: bigint;
			}): string =>
				augustus.encodeFunctionData('swapExactAmountInOnBalancerV2', [
					{
						fromAmount: amount,
						toAmount: minimum,
						quotedAmount: swapData.quotedAmount,
						metadata: NO_METADATA,
						// The approve flag rides in the top bit.
						beneficiaryAndApproveFlag: (1n << 255n) | BigInt(beneficiary)
					},
					partnerAndFee,
					'0x',
					vaultCall
				]);

			it.each([
				{ case: 'a single swap', vaultCall: single({ assetIn: USDC, assetOut: WETH }) },
				{ case: 'a batch swap', vaultCall: batch({ kind: 0, assets: [USDC, DAI, WETH] }) },
				{
					case: 'a batch swap listed from the destination',
					vaultCall: batch({ kind: 1, assets: [WETH, DAI, USDC] })
				}
			])('reads the tokens of $case as Augustus does', ({ vaultCall }) => {
				expect(() => assertVeloraMarketTransaction(withData(encode({ vaultCall })))).not.toThrow();
			});

			it('reads the vault zero address as native ETH', () => {
				expect(() =>
					assertVeloraMarketTransaction({
						...withData(
							encode({ vaultCall: single({ assetIn: USDC, assetOut: ZERO_ETH_ADDRESS }) })
						),
						destToken: SWAP_ETH_TOKEN_PLACEHOLDER
					})
				).not.toThrow();
			});

			it('refuses another beneficiary', () => {
				expect(() =>
					assertVeloraMarketTransaction(
						withData(
							encode({ vaultCall: single({ assetIn: USDC, assetOut: WETH }), beneficiary: OTHER })
						)
					)
				).toThrow('not paid');
			});

			it('refuses a sale that does not cap the surplus', () => {
				expect(() =>
					assertVeloraMarketTransaction(
						withData(
							encode({ vaultCall: single({ assetIn: USDC, assetOut: WETH }), partnerAndFee: ZERO })
						)
					)
				).toThrow('does not cap the surplus');
			});

			it('refuses a vault call selling another token', () => {
				expect(() =>
					assertVeloraMarketTransaction(
						withData(encode({ vaultCall: single({ assetIn: DAI, assetOut: WETH }) }))
					)
				).toThrow('does not sell');
			});

			it('refuses a vault call Augustus does not read', () => {
				expect(() =>
					assertVeloraMarketTransaction(withData(encode({ vaultCall: '0x12345678' })))
				).toThrow('not one Augustus reads');
			});
		});

		describe('swapOnAugustusRFQTryBatchFill', () => {
			const rfqOrder = ({
				takerAsset = USDC,
				makerAsset = WETH
			}: {
				takerAsset?: string;
				makerAsset?: string;
			} = {}) => ({
				order: {
					nonceAndMeta: ZERO,
					expiry: ZERO,
					makerAsset,
					takerAsset,
					maker: OTHER,
					taker: AUGUSTUS,
					makerAmount: minimum,
					takerAmount: amount
				},
				signature: '0x',
				takerTokenFillAmount: amount,
				permitTakerAsset: '0x',
				permitMakerAsset: '0x'
			});

			const encode = ({
				wrapApproveDirection = 0,
				beneficiary = ZERO_ETH_ADDRESS,
				orders = [rfqOrder()]
			}: {
				wrapApproveDirection?: number;
				beneficiary?: string;
				orders?: ReturnType<typeof rfqOrder>[];
			} = {}): string =>
				augustus.encodeFunctionData('swapOnAugustusRFQTryBatchFill', [
					{
						fromAmount: amount,
						toAmount: minimum,
						wrapApproveDirection,
						metadata: NO_METADATA,
						beneficiary
					},
					orders,
					'0x'
				]);

			it('accepts a fill of the reviewed tokens, with or without approval', () => {
				expect(() => assertVeloraMarketTransaction(withData(encode()))).not.toThrow();
				expect(() =>
					assertVeloraMarketTransaction(withData(encode({ wrapApproveDirection: 0b100 })))
				).not.toThrow();
			});

			it.each([
				{
					case: 'wraps native ETH',
					change: { wrapApproveDirection: 1 },
					reason: 'wraps native ETH'
				},
				{
					case: 'buys an exact amount',
					change: { wrapApproveDirection: 0b1000 },
					reason: 'buys an exact amount'
				},
				{ case: 'pays another beneficiary', change: { beneficiary: OTHER }, reason: 'not paid' },
				{
					case: 'mixes orders of other tokens',
					change: { orders: [rfqOrder(), rfqOrder({ makerAsset: DAI })] },
					reason: 'do not all trade the same tokens'
				},
				{
					case: 'sells another token',
					change: { orders: [rfqOrder({ takerAsset: DAI })] },
					reason: 'does not sell'
				},
				{ case: 'has no order', change: { orders: [] }, reason: 'do not all trade the same tokens' }
			])('refuses a fill that $case', ({ change, reason }) => {
				expect(() => assertVeloraMarketTransaction(withData(encode(change)))).toThrow(reason);
			});
		});

		it('refuses an Augustus function OISY does not read', () => {
			// `swapExactAmountOut`: OISY never buys an exact amount.
			expect(() => assertVeloraMarketTransaction(withData(`0x7f457675${'00'.repeat(32)}`))).toThrow(
				'an Augustus function OISY does not read'
			);
		});

		it('refuses calldata that cannot be decoded', () => {
			expect(() =>
				assertVeloraMarketTransaction(withData(`${veloraTransaction.data.slice(0, 74)}`))
			).toThrow('cannot be read');
		});
	});
});
