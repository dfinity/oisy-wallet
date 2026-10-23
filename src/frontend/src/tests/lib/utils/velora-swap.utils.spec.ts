import { VELORA_AUGUSTUS_SELL_ABI } from '$eth/constants/velora.constants';
import { ZERO, ZERO_ETH_ADDRESS } from '$lib/constants/app.constants';
import { SWAP_ETH_TOKEN_PLACEHOLDER } from '$lib/constants/swap.constants';
import { VeloraSwapRejectedError } from '$lib/types/errors';
import {
	assertVeloraDeltaOrder,
	assertVeloraDeltaRoute,
	assertVeloraMarketTransaction,
	veloraMinimumAmount
} from '$lib/utils/velora-swap.utils';
import type { DeltaAuctionOrder, DeltaRoute, TransactionParams } from '@velora-dex/sdk';
import { Interface } from 'ethers/abi';

const WALLET = '0x5a52e96bacdabb82fd05763e25335261b270efcb';
const OTHER = '0x1111111111111111111111111111111111111111';
const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const DAI = '0x6b175474e89094c44da98b954eedeac495271d0f';
const AUGUSTUS = '0x6a000f20005980200259b80c5102003040001068';
const NO_METADATA = `0x${'00'.repeat(32)}`;

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

		const crossChainRoute: DeltaRoute = {
			...sameChainRoute,
			destination: {
				input: { token: { chainId: 8453, address: DAI }, amount: '99976241', amountUSD: '99.95' },
				output: { token: { chainId: 8453, address: DAI }, amount: '99976241', amountUSD: '99.95' }
			},
			bridge: {
				protocol: 'Across',
				estimatedTimeMs: 2000,
				tags: ['recommended'],
				contractParams: {
					protocolSelector: '0x2e09f389',
					outputToken: DAI,
					scalingFactor: -12,
					protocolData: '0xabcdef'
				}
			}
		};

		const crossChainOrder: DeltaAuctionOrder = {
			...sameChainOrder,
			bridge: {
				protocolSelector: '0x2e09f389',
				destinationChainId: 8453,
				outputToken: DAI,
				scalingFactor: -12,
				protocolData: '0xabcdef'
			}
		};

		describe('assertVeloraDeltaRoute', () => {
			const params = {
				route: sameChainRoute,
				sourceTokenAddress: USDC,
				sourceChainId: 1n,
				destinationTokenAddress: WETH,
				destinationChainId: 1n,
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
						destinationTokenAddress: DAI,
						destinationChainId: 8453n
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
						destinationTokenAddress: DAI,
						destinationChainId: 8453n
					},
					reason: 'has no bridge'
				}
			])('refuses $case', ({ change, reason }) => {
				expect(() => assertVeloraDeltaRoute({ ...params, ...change })).toThrow(reason);
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
						order: { ...sameChainOrder, partnerAndFee: `${(1n << 96n) | 25n}` },
						feePercent: 0.25
					})
				).not.toThrow();
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
				ZERO,
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
				encode: ({ data, fee = ZERO }: Sale) =>
					augustus.encodeFunctionData('swapExactAmountIn', [OTHER, data, fee, '0x', '0x'])
			},
			{
				name: 'swapExactAmountInOnUniswapV2',
				encode: ({ data, fee = ZERO }: Sale) =>
					augustus.encodeFunctionData('swapExactAmountInOnUniswapV2', [
						{ ...data, pools: '0x' },
						fee,
						'0x'
					])
			},
			{
				name: 'swapExactAmountInOnCurveV1',
				encode: ({ data, fee = ZERO }: Sale) =>
					augustus.encodeFunctionData('swapExactAmountInOnCurveV1', [
						{ curveData: ZERO, curveAssets: ZERO, ...data },
						fee,
						'0x'
					])
			},
			{
				name: 'swapExactAmountInOnCurveV2',
				encode: ({ data, fee = ZERO }: Sale) =>
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
					assertVeloraMarketTransaction(withData(encode({ data: swapData, fee: 1n })))
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
				beneficiary = WALLET
			}: {
				vaultCall: string;
				beneficiary?: string;
			}): string =>
				augustus.encodeFunctionData('swapExactAmountInOnBalancerV2', [
					{
						fromAmount: amount,
						toAmount: minimum,
						quotedAmount: minimum,
						metadata: NO_METADATA,
						// The approve flag rides in the top bit.
						beneficiaryAndApproveFlag: (1n << 255n) | BigInt(beneficiary)
					},
					ZERO,
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
