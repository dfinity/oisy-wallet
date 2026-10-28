import { BASE_NETWORK, BASE_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.base.env';
import { ETHEREUM_NETWORK, ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { EURC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.eurc.env';
import { USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.usdc.env';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import {
	UNISWAP_COMMANDS,
	UNISWAP_CONTRACT_BALANCE,
	UNISWAP_EXECUTE_HASH,
	UNISWAP_RECIPIENT_ROUTER,
	UNISWAP_RECIPIENT_SENDER,
	UNISWAP_V4_ACTIONS
} from '$eth/constants/uniswap.constants';
import { getUniswapSwap, type GetUniswapSwapParams } from '$eth/utils/uniswap.utils';
import { MAX_UINT_160, MAX_UINT_256, ZERO, ZERO_ETH_ADDRESS } from '$lib/constants/app.constants';
import {
	mockUniswapDeadline as DEADLINE,
	mockUniswapRouter as ROUTER,
	UNISWAP_V3_SWAP_TYPES,
	mockUniswapWallet as WALLET,
	encodeUniswapCommand as encode,
	encodeUniswapEurcToUsdc,
	encodeUniswapExecute as execute,
	encodeUniswapV3Path as path,
	encodeUniswapPermit as permit,
	encodeUniswapSweep as sweep,
	encodeUniswapV3Swap as v3Swap,
	type MockUniswapCommand as Command
} from '$tests/mocks/uniswap.mock';
import { AbiCoder } from 'ethers/abi';
import { hexlify } from 'ethers/utils';

describe('uniswap.utils', () => {
	const coder = AbiCoder.defaultAbiCoder();

	const OTHER = '0x96329840d29ab4ac4A324cA0B01F64EAE7aA7a6a';
	const UNLISTED = '0xcA11bde05977b3631167028862bE2a173976CA11';
	const WETH = '0x4200000000000000000000000000000000000006';

	// Router 2.0.0 on Base.
	const ROUTER_2_0 = '0x6ff5693b99212da76ad316178a184ab56d299b43';

	const EURC = EURC_TOKEN.address;
	const USDC = USDC_TOKEN.address;

	const V3_SWAP = UNISWAP_V3_SWAP_TYPES;
	const V2_SWAP = ['address', 'uint256', 'uint256', 'address[]', 'bool', 'uint256[]'];
	const POOL_KEY = 'tuple(address,address,uint24,int24,address)';
	const V4_SWAP_SINGLE = `tuple(${POOL_KEY},bool,uint128,uint128,uint256,bytes)`;
	const V4_SWAP =
		'tuple(address,tuple(address,uint24,int24,address,bytes)[],uint256[],uint128,uint128)';

	const v4Swap = (actions: { action: number; types: string[]; values: unknown[] }[]): Command =>
		encode({
			type: UNISWAP_COMMANDS.V4_SWAP,
			types: ['bytes', 'bytes[]'],
			values: [
				hexlify(Uint8Array.from(actions.map(({ action }) => action))),
				actions.map(({ types, values }) => coder.encode(types, values))
			]
		});

	const params = ({
		data,
		...overrides
	}: Partial<GetUniswapSwapParams> & { data: string }): GetUniswapSwapParams => ({
		to: ROUTER,
		data,
		chainId: BASE_NETWORK.chainId,
		networkId: BASE_NETWORK_ID,
		value: ZERO,
		wallet: WALLET,
		nativeToken: BASE_ETH_TOKEN,
		tokens: [EURC_TOKEN, USDC_TOKEN],
		...overrides
	});

	const eurcToUsdc = encodeUniswapEurcToUsdc();

	describe('getUniswapSwap', () => {
		it('should describe an exact-input swap paid to the wallet', () => {
			expect(getUniswapSwap(params({ data: eurcToUsdc }))).toEqual({
				router: { chainId: BASE_NETWORK.chainId, address: ROUTER, version: '2.1.2' },
				paid: { token: EURC_TOKEN, amount: 1_000_000n, atMost: false },
				received: { token: USDC_TOKEN, amount: 1_087_807n },
				fees: [],
				deadline: Number(DEADLINE)
			});
		});

		it('should read the sender stand-in as the wallet', () => {
			const data = execute({
				commands: [
					v3Swap({ recipient: UNISWAP_RECIPIENT_SENDER, amount: 1_000_000n, amountLimit: 7n }),
					sweep({ recipient: UNISWAP_RECIPIENT_SENDER })
				]
			});

			const swap = getUniswapSwap(params({ data }));

			expect(swap?.received).toEqual({ token: USDC_TOKEN, amount: 7n });
			expect(swap?.recipient).toBeUndefined();
		});

		it('should read the router however the letter case of its address is written', () => {
			expect(getUniswapSwap(params({ data: eurcToUsdc, to: ROUTER.toLowerCase() }))).toBeDefined();
		});

		it('should read the arguments without trailing bytes too', () => {
			expect(
				getUniswapSwap(
					params({
						data: execute({
							commands: [v3Swap({ amount: 1_000_000n, amountLimit: 1_087_807n }), sweep()],
							tail: ''
						})
					})
				)
			).toBeDefined();
		});

		it.each([
			{ case: 'another contract', overrides: { to: OTHER } },
			{ case: 'no destination', overrides: { to: undefined } },
			{
				case: 'the same address on another network',
				overrides: { chainId: ETHEREUM_NETWORK.chainId, networkId: ETHEREUM_NETWORK_ID }
			},
			{ case: 'no wallet address', overrides: { wallet: undefined } }
		])('should not describe a swap to $case', ({ overrides }) => {
			expect(getUniswapSwap(params({ data: eurcToUsdc, ...overrides }))).toBeUndefined();
		});

		it('should not describe calldata that is not an execute', () => {
			expect(getUniswapSwap(params({ data: `0x095ea7b3${'00'.repeat(64)}` }))).toBeUndefined();
			expect(getUniswapSwap(params({ data: '0x' }))).toBeUndefined();
			expect(getUniswapSwap(params({ data: `${UNISWAP_EXECUTE_HASH}1234` }))).toBeUndefined();
		});

		it('should state no deadline for an execute without one', () => {
			const data = execute({
				commands: [v3Swap({ amount: 1_000_000n, amountLimit: 1n })],
				deadline: null
			});

			const swap = getUniswapSwap(params({ data }));

			expect(swap).toBeDefined();
			expect(swap?.deadline).toBeUndefined();
		});

		it('should state no deadline for one too far out to be a date', () => {
			const data = execute({
				commands: [v3Swap({ amount: 1_000_000n, amountLimit: 1n })],
				deadline: MAX_UINT_256
			});

			expect(getUniswapSwap(params({ data }))?.deadline).toBeUndefined();
		});

		it('should describe the native coin paid in through a wrap, with any of it returned', () => {
			const value = 300_000_000_000_000_000n;

			const data = execute({
				commands: [
					encode({
						type: UNISWAP_COMMANDS.WRAP_ETH,
						types: ['address', 'uint256'],
						values: [UNISWAP_RECIPIENT_ROUTER, value]
					}),
					v3Swap({
						amount: UNISWAP_CONTRACT_BALANCE,
						amountLimit: 990_000n,
						tokens: [WETH, USDC],
						payerIsUser: false
					}),
					sweep({ token: ZERO_ETH_ADDRESS })
				]
			});

			expect(getUniswapSwap(params({ data, value }))).toEqual(
				expect.objectContaining({
					paid: { token: BASE_ETH_TOKEN, amount: value, atMost: false },
					received: { token: USDC_TOKEN, amount: 990_000n }
				})
			);
		});

		it('should describe a swap to the native coin with the allowance it grants', () => {
			const data = execute({
				commands: [
					permit({ token: USDC }),
					v3Swap({
						recipient: UNISWAP_RECIPIENT_ROUTER,
						amount: 29_829_946n,
						amountLimit: ZERO,
						tokens: [USDC, WETH]
					}),
					encode({
						type: UNISWAP_COMMANDS.UNWRAP_WETH,
						types: ['address', 'uint256'],
						values: [WALLET, 12_661_051_734_709_737n]
					})
				]
			});

			expect(getUniswapSwap(params({ data }))).toEqual(
				expect.objectContaining({
					paid: { token: USDC_TOKEN, amount: 29_829_946n, atMost: false },
					received: { token: BASE_ETH_TOKEN, amount: 12_661_051_734_709_737n },
					approval: {
						token: USDC_TOKEN,
						amount: MAX_UINT_160,
						unlimited: true,
						expiration: 1_795_682_829
					}
				})
			);
		});

		it('should state a limited allowance as such', () => {
			const data = execute({
				commands: [permit({ amount: 5_000_000n }), v3Swap({ amount: 1_000_000n, amountLimit: 1n })]
			});

			expect(getUniswapSwap(params({ data }))?.approval).toEqual(
				expect.objectContaining({ amount: 5_000_000n, unlimited: false })
			);
		});

		it('should describe an allowance expiring on the last date JavaScript can hold', () => {
			const data = execute({
				commands: [
					permit({ expiration: 8_640_000_000_000n }),
					v3Swap({ amount: 1_000_000n, amountLimit: 1n })
				]
			});

			expect(getUniswapSwap(params({ data }))?.approval).toEqual(
				expect.objectContaining({ expiration: 8_640_000_000_000 })
			);
		});

		it.each([
			{ case: 'names another spender', command: permit({ spender: OTHER }) },
			{ case: 'expires with the current block', command: permit({ expiration: ZERO }) },
			{
				case: 'expires past the last date JavaScript can hold',
				command: permit({ expiration: 2n ** 48n - 1n })
			}
		])('should not describe a swap whose allowance $case', ({ command }) => {
			const data = execute({
				commands: [command, v3Swap({ amount: 1_000_000n, amountLimit: 1n })]
			});

			expect(getUniswapSwap(params({ data }))).toBeUndefined();
		});

		it('should not describe a swap granting two allowances', () => {
			const data = execute({
				commands: [
					permit(),
					permit({ token: USDC }),
					v3Swap({ amount: 1_000_000n, amountLimit: 1n })
				]
			});

			expect(getUniswapSwap(params({ data }))).toBeUndefined();
		});

		it('should state the recipient of tokens that go to another address', () => {
			const data = execute({
				commands: [v3Swap({ recipient: OTHER, amount: 1_000_000n, amountLimit: 1_087_807n })]
			});

			const swap = getUniswapSwap(params({ data }));

			expect(swap?.recipient).toBe(OTHER);
			expect(swap?.received).toEqual({ token: USDC_TOKEN, amount: 1_087_807n });
		});

		it('should not describe tokens delivered to both the wallet and another address', () => {
			const data = execute({
				commands: [v3Swap({ amount: 1_000_000n, amountLimit: 1n }), sweep({ recipient: OTHER })]
			});

			expect(getUniswapSwap(params({ data }))).toBeUndefined();
		});

		it('should state no minimum when the router enforces none', () => {
			const data = execute({
				commands: [
					v3Swap({ recipient: UNISWAP_RECIPIENT_ROUTER, amount: 1_000_000n, amountLimit: ZERO }),
					sweep()
				]
			});

			expect(getUniswapSwap(params({ data }))?.received).toEqual({
				token: USDC_TOKEN,
				amount: ZERO
			});
		});

		it('should count tokens left in the router as not received', () => {
			const data = execute({
				commands: [
					v3Swap({ recipient: UNISWAP_RECIPIENT_ROUTER, amount: 1_000_000n, amountLimit: 1n }),
					sweep({ amountMin: 5n })
				]
			});

			expect(getUniswapSwap(params({ data }))?.received.amount).toBe(5n);
		});

		it('should state the fees paid out of the swapped tokens', () => {
			const data = execute({
				commands: [
					v3Swap({ recipient: UNISWAP_RECIPIENT_ROUTER, amount: 1_000_000n, amountLimit: ZERO }),
					encode({
						type: UNISWAP_COMMANDS.PAY_PORTION,
						types: ['address', 'address', 'uint256'],
						values: [USDC, OTHER, 25n]
					}),
					encode({
						type: UNISWAP_COMMANDS.PAY_PORTION_FULL_PRECISION,
						types: ['address', 'address', 'uint256'],
						values: [USDC, OTHER, 10n ** 15n]
					}),
					encode({
						type: UNISWAP_COMMANDS.TRANSFER,
						types: ['address', 'address', 'uint256'],
						values: [USDC, OTHER, 1_000n]
					}),
					sweep({ amountMin: 1_080_000n })
				]
			});

			const swap = getUniswapSwap(params({ data }));

			expect(swap?.fees).toEqual([
				{ token: USDC_TOKEN, recipient: OTHER, share: 25n * 10n ** 14n },
				{ token: USDC_TOKEN, recipient: OTHER, share: 10n ** 15n },
				{ token: USDC_TOKEN, recipient: OTHER, amount: 1_000n }
			]);
			expect(swap?.received.amount).toBe(1_080_000n);
		});

		it.each([
			{
				case: 'a share above all of it',
				command: encode({
					type: UNISWAP_COMMANDS.PAY_PORTION,
					types: ['address', 'address', 'uint256'],
					values: [USDC, OTHER, 10_001n]
				})
			},
			{
				case: "the router's whole balance as a flat fee",
				command: encode({
					type: UNISWAP_COMMANDS.TRANSFER,
					types: ['address', 'address', 'uint256'],
					values: [USDC, OTHER, UNISWAP_CONTRACT_BALANCE]
				})
			}
		])('should not describe a swap paying $case', ({ command }) => {
			const data = execute({
				commands: [
					v3Swap({ recipient: UNISWAP_RECIPIENT_ROUTER, amount: 1_000_000n, amountLimit: ZERO }),
					command,
					sweep()
				]
			});

			expect(getUniswapSwap(params({ data }))).toBeUndefined();
		});

		it('should state the most an exact-output swap pays', () => {
			const data = execute({
				commands: [v3Swap({ exactInput: false, amount: 1_087_807n, amountLimit: 1_010_000n })]
			});

			expect(getUniswapSwap(params({ data }))).toEqual(
				expect.objectContaining({
					paid: { token: EURC_TOKEN, amount: 1_010_000n, atMost: true },
					received: { token: USDC_TOKEN, amount: 1_087_807n }
				})
			);
		});

		it('should describe a V2 swap', () => {
			const data = execute({
				commands: [
					encode({
						type: UNISWAP_COMMANDS.V2_SWAP_EXACT_IN,
						types: V2_SWAP,
						values: [WALLET, 1_000_000n, 1_087_807n, [EURC, USDC], true, []]
					})
				]
			});

			expect(getUniswapSwap(params({ data }))).toEqual(
				expect.objectContaining({
					paid: { token: EURC_TOKEN, amount: 1_000_000n, atMost: false },
					received: { token: USDC_TOKEN, amount: 1_087_807n }
				})
			);
		});

		it('should describe tokens pulled into the router and swapped from there', () => {
			const data = execute({
				commands: [
					encode({
						type: UNISWAP_COMMANDS.PERMIT2_TRANSFER_FROM,
						types: ['address', 'address', 'uint160'],
						values: [EURC, UNISWAP_RECIPIENT_ROUTER, 1_000_000n]
					}),
					v3Swap({
						amount: UNISWAP_CONTRACT_BALANCE,
						amountLimit: 1_087_807n,
						payerIsUser: false
					})
				]
			});

			expect(getUniswapSwap(params({ data }))?.paid).toEqual({
				token: EURC_TOKEN,
				amount: 1_000_000n,
				atMost: false
			});
		});

		describe('V4', () => {
			const swapExactInSingle = {
				action: UNISWAP_V4_ACTIONS.SWAP_EXACT_IN_SINGLE,
				types: [V4_SWAP_SINGLE],
				values: [
					[[EURC, USDC, 500, 10, ZERO_ETH_ADDRESS], true, 1_000_000n, 1_087_807n, ZERO, '0x']
				]
			};

			const swapExactIn = {
				action: UNISWAP_V4_ACTIONS.SWAP_EXACT_IN,
				types: [V4_SWAP],
				values: [[EURC, [[USDC, 500, 10, ZERO_ETH_ADDRESS, '0x']], [], 1_000_000n, 1_087_807n]]
			};

			const settle = ({
				currency = EURC,
				amount = ZERO,
				payerIsUser = true
			}: {
				currency?: string;
				amount?: bigint;
				payerIsUser?: boolean;
			} = {}) => ({
				action: UNISWAP_V4_ACTIONS.SETTLE,
				types: ['address', 'uint256', 'bool'],
				values: [currency, amount, payerIsUser]
			});

			const take = ({
				currency = USDC,
				recipient = WALLET,
				amount = ZERO
			}: {
				currency?: string;
				recipient?: string;
				amount?: bigint;
			} = {}) => ({
				action: UNISWAP_V4_ACTIONS.TAKE,
				types: ['address', 'address', 'uint256'],
				values: [currency, recipient, amount]
			});

			it('should describe a swap whose take of the whole credit inherits its minimum', () => {
				const data = execute({ commands: [v4Swap([swapExactIn, settle(), take()])] });

				expect(getUniswapSwap(params({ data }))).toEqual(
					expect.objectContaining({
						paid: { token: EURC_TOKEN, amount: 1_000_000n, atMost: false },
						received: { token: USDC_TOKEN, amount: 1_087_807n }
					})
				);
			});

			it('should describe a swap settled and taken in full', () => {
				const data = execute({
					commands: [
						v4Swap([
							swapExactInSingle,
							{
								action: UNISWAP_V4_ACTIONS.SETTLE_ALL,
								types: ['address', 'uint256'],
								values: [EURC, 2_000_000n]
							},
							{
								action: UNISWAP_V4_ACTIONS.TAKE_ALL,
								types: ['address', 'uint256'],
								values: [USDC, 1_000_000n]
							}
						])
					]
				});

				expect(getUniswapSwap(params({ data }))).toEqual(
					expect.objectContaining({
						paid: { token: EURC_TOKEN, amount: 1_000_000n, atMost: false },
						received: { token: USDC_TOKEN, amount: 1_087_807n }
					})
				);
			});

			it('should state a fee taken out of the credit, and no minimum for what is left', () => {
				const data = execute({
					commands: [
						v4Swap([
							swapExactIn,
							settle(),
							{
								action: UNISWAP_V4_ACTIONS.TAKE_PORTION,
								types: ['address', 'address', 'uint256'],
								values: [USDC, OTHER, 25n]
							},
							take()
						])
					]
				});

				const swap = getUniswapSwap(params({ data }));

				expect(swap?.fees).toEqual([
					{ token: USDC_TOKEN, recipient: OTHER, share: 25n * 10n ** 14n }
				]);
				expect(swap?.received.amount).toBe(ZERO);
			});

			it('should state the most an exact-output swap pays', () => {
				const data = execute({
					commands: [
						v4Swap([
							{
								action: UNISWAP_V4_ACTIONS.SWAP_EXACT_OUT_SINGLE,
								types: [V4_SWAP_SINGLE],
								values: [
									[
										[EURC, USDC, 500, 10, ZERO_ETH_ADDRESS],
										true,
										1_087_807n,
										1_010_000n,
										ZERO,
										'0x'
									]
								]
							},
							settle(),
							take({ amount: 1_087_807n })
						])
					]
				});

				expect(getUniswapSwap(params({ data }))).toEqual(
					expect.objectContaining({
						paid: { token: EURC_TOKEN, amount: 1_010_000n, atMost: true },
						received: { token: USDC_TOKEN, amount: 1_087_807n }
					})
				);
			});

			// Before 2.1.2, a V4 exact-output swap reverted on its input only, so a pool short of
			// liquidity could deliver part of the output to whoever takes it.
			describe('an exact-output swap taken in full', () => {
				// Router 2.1.1 on Base.
				const ROUTER_2_1_1 = '0xFdf682F51FE81Aa4898F0AE2163d8A55c127fbC7';

				const POOL = [EURC, USDC, 500, 10, ZERO_ETH_ADDRESS];

				const exactOutput2_1 = {
					action: UNISWAP_V4_ACTIONS.SWAP_EXACT_OUT_SINGLE,
					types: [V4_SWAP_SINGLE],
					values: [[POOL, true, 1_087_807n, 1_010_000n, ZERO, '0x']]
				};

				const exactOutput2_0 = {
					action: UNISWAP_V4_ACTIONS.SWAP_EXACT_OUT_SINGLE,
					types: [`tuple(${POOL_KEY},bool,uint128,uint128,bytes)`],
					values: [[POOL, true, 1_087_807n, 1_010_000n, '0x']]
				};

				const takeAll = (minAmount: bigint) => ({
					action: UNISWAP_V4_ACTIONS.TAKE_ALL,
					types: ['address', 'uint256'],
					values: [USDC, minAmount]
				});

				it.each([
					{ version: '2.0.0', to: ROUTER_2_0, swap: exactOutput2_0 },
					{ version: '2.1.1', to: ROUTER_2_1_1, swap: exactOutput2_1 }
				])('should count none of its output on $version', ({ version, to, swap }) => {
					const data = execute({ commands: [v4Swap([swap, settle(), take()])] });

					expect(getUniswapSwap(params({ data, to }))).toEqual(
						expect.objectContaining({
							router: expect.objectContaining({ version }),
							paid: { token: EURC_TOKEN, amount: 1_010_000n, atMost: true },
							received: { token: USDC_TOKEN, amount: ZERO }
						})
					);
				});

				it('should keep the minimum a take of everything states on 2.1.1', () => {
					const data = execute({
						commands: [v4Swap([exactOutput2_1, settle(), takeAll(1_000_000n)])]
					});

					expect(getUniswapSwap(params({ data, to: ROUTER_2_1_1 }))?.received).toEqual({
						token: USDC_TOKEN,
						amount: 1_000_000n
					});
				});

				it('should count its whole output on 2.1.2', () => {
					const data = execute({ commands: [v4Swap([exactOutput2_1, settle(), take()])] });

					expect(getUniswapSwap(params({ data }))?.received).toEqual({
						token: USDC_TOKEN,
						amount: 1_087_807n
					});
				});
			});

			it('should describe the native coin paid in and settled by the router', () => {
				const value = 307_938_748_743_669n;

				const data = execute({
					commands: [
						v4Swap([
							settle({ currency: ZERO_ETH_ADDRESS, amount: value, payerIsUser: false }),
							{
								...swapExactInSingle,
								values: [
									[
										[ZERO_ETH_ADDRESS, USDC, 500, 10, ZERO_ETH_ADDRESS],
										true,
										value,
										990_000n,
										ZERO,
										'0x'
									]
								]
							},
							take()
						]),
						sweep()
					]
				});

				expect(getUniswapSwap(params({ data, value }))).toEqual(
					expect.objectContaining({
						paid: { token: BASE_ETH_TOKEN, amount: value, atMost: false },
						received: { token: USDC_TOKEN, amount: 990_000n }
					})
				);
			});

			// A take of the input currency adds to what is owed of it, so an open settlement could pull
			// more than the swap spends.
			it('should not describe an open settlement that a take of the same currency adds to', () => {
				const data = execute({
					commands: [
						v4Swap([
							swapExactIn,
							take({ currency: EURC, recipient: UNISWAP_RECIPIENT_ROUTER, amount: 5_000_000n }),
							settle(),
							take()
						])
					]
				});

				expect(getUniswapSwap(params({ data }))).toBeUndefined();
			});

			it('should not describe an action the router does not run', () => {
				const data = execute({
					commands: [
						v4Swap([
							swapExactIn,
							settle(),
							{
								action: 0x14,
								types: ['address', 'address', 'uint256'],
								values: [USDC, WALLET, ZERO]
							}
						])
					]
				});

				expect(getUniswapSwap(params({ data }))).toBeUndefined();
			});

			it('should not describe a settlement of the whole router balance by the wallet', () => {
				const data = execute({
					commands: [v4Swap([swapExactIn, settle({ amount: UNISWAP_CONTRACT_BALANCE }), take()])]
				});

				expect(getUniswapSwap(params({ data }))).toBeUndefined();
			});

			// The router pays only what is still owed, so the swaps' inputs no longer bound a second
			// settlement of the same currency.
			it.each([
				{ case: 'a partial settlement', first: settle({ amount: 500_000n }) },
				{
					case: 'a settlement the router funds',
					first: settle({ amount: 400_000n, payerIsUser: false })
				}
			])('should not describe $case followed by an open one', ({ first }) => {
				const data = execute({ commands: [v4Swap([swapExactIn, first, settle(), take()])] });

				expect(getUniswapSwap(params({ data }))).toBeUndefined();
			});
		});

		describe('commands OISY does not read', () => {
			it.each([
				{ case: 'a sub-plan', type: 0x21 },
				{ case: 'a batch permit', type: 0x03 },
				{ case: 'a position-manager call', type: 0x12 },
				{ case: 'an Across bridge deposit', type: 0x40 }
			])('should not describe a plan with $case', ({ type }) => {
				const data = execute({
					commands: [
						v3Swap({ amount: 1_000_000n, amountLimit: 1n }),
						{ type, input: coder.encode(['bytes', 'bytes[]'], ['0x', []]) }
					]
				});

				expect(getUniswapSwap(params({ data }))).toBeUndefined();
			});

			it('should read a command whose allow-revert bit is set', () => {
				const swap = v3Swap({ amount: 1_000_000n, amountLimit: 1n });

				expect(
					getUniswapSwap(
						params({ data: execute({ commands: [{ ...swap, type: swap.type | 0x80 }] }) })
					)
				).toBeDefined();
			});

			// A permit allowed to fail leaves whatever allowance the router already had in place.
			it('should not describe a plan whose permit is allowed to fail', () => {
				const command = permit();

				const plan = (type: number) =>
					execute({
						commands: [{ ...command, type }, v3Swap({ amount: 1_000_000n, amountLimit: 1n })]
					});

				expect(getUniswapSwap(params({ data: plan(command.type) }))).toBeDefined();
				expect(getUniswapSwap(params({ data: plan(command.type | 0x80) }))).toBeUndefined();
			});

			it.each([
				{
					case: 'wraps to the wallet',
					command: encode({
						type: UNISWAP_COMMANDS.WRAP_ETH,
						types: ['address', 'uint256'],
						values: [WALLET, 1n]
					})
				},
				{
					case: 'pulls tokens to another address',
					command: encode({
						type: UNISWAP_COMMANDS.PERMIT2_TRANSFER_FROM,
						types: ['address', 'address', 'uint160'],
						values: [EURC, OTHER, 1n]
					})
				},
				{
					case: 'pulls the whole router balance from the wallet',
					command: v3Swap({ amount: UNISWAP_CONTRACT_BALANCE, amountLimit: 1n })
				},
				{
					case: 'swaps an input paid to a V2 pair beforehand',
					command: encode({
						type: UNISWAP_COMMANDS.V2_SWAP_EXACT_IN,
						types: V2_SWAP,
						values: [WALLET, ZERO, 1n, [EURC, USDC], false, []]
					})
				},
				{
					case: 'sends the token it pays to another address',
					command: sweep({ token: EURC, recipient: OTHER })
				}
			])('should not describe a plan that $case', ({ command }) => {
				const data = execute({
					commands: [v3Swap({ amount: 1_000_000n, amountLimit: 1n }), command]
				});

				expect(getUniswapSwap(params({ data }))).toBeUndefined();
			});

			it('should not describe a plan whose commands and inputs differ in number', () => {
				const swap = v3Swap({ amount: 1_000_000n, amountLimit: 1n });

				const data = `${UNISWAP_EXECUTE_HASH}${coder
					.encode(['bytes', 'bytes[]', 'uint256'], ['0x0004', [swap.input], DEADLINE])
					.slice(2)}`;

				expect(getUniswapSwap(params({ data }))).toBeUndefined();
			});
		});

		describe('what the wallet pays and receives', () => {
			it('should not describe a plan paying in two tokens', () => {
				expect(getUniswapSwap(params({ data: eurcToUsdc, value: 1n }))).toBeUndefined();
			});

			it('should not describe a plan paying in nothing', () => {
				expect(getUniswapSwap(params({ data: execute({ commands: [sweep()] }) }))).toBeUndefined();
			});

			it('should not describe a plan delivering two tokens', () => {
				const data = execute({
					commands: [
						v3Swap({ amount: 1_000_000n, amountLimit: 1n }),
						sweep({ token: WETH, amountMin: 1n })
					]
				});

				const weth = { ...USDC_TOKEN, address: WETH, symbol: 'WETH', decimals: 18 };

				expect(
					getUniswapSwap(params({ data, tokens: [EURC_TOKEN, USDC_TOKEN, weth] }))
				).toBeUndefined();
			});

			it('should not describe a swap into a token OISY does not list', () => {
				const data = execute({
					commands: [v3Swap({ amount: 1_000_000n, amountLimit: 1n, tokens: [EURC, UNLISTED] })]
				});

				expect(getUniswapSwap(params({ data }))).toBeUndefined();
			});

			it('should only match tokens listed on the request network', () => {
				expect(
					getUniswapSwap(
						params({
							data: eurcToUsdc,
							tokens: [EURC_TOKEN, { ...USDC_TOKEN, network: ETHEREUM_NETWORK }]
						})
					)
				).toBeUndefined();
			});
		});

		describe('encodings', () => {
			it('should not describe a value with bits beyond its type', () => {
				// A `uint160` minimum with bit 160 set: ethers would decode it as the low bits alone.
				const command = sweep({ amountMin: 5n });

				const withMinimum = (minimum: bigint) =>
					execute({
						commands: [
							v3Swap({ amount: 1_000_000n, amountLimit: 1n }),
							{
								...command,
								input: `${command.input.slice(0, 2 + 64 * 2)}${minimum.toString(16).padStart(64, '0')}`
							}
						]
					});

				expect(getUniswapSwap(params({ data: withMinimum(5n) }))?.received.amount).toBe(6n);
				expect(getUniswapSwap(params({ data: withMinimum(5n | (1n << 160n)) }))).toBeUndefined();
			});

			it('should not describe an input with bytes past its encoding', () => {
				const swap = v3Swap({ amount: 1_000_000n, amountLimit: 1n });

				const data = execute({ commands: [{ ...swap, input: `${swap.input}${'00'.repeat(32)}` }] });

				expect(getUniswapSwap(params({ data }))).toBeUndefined();
			});

			it('should not describe a V3 path of broken pools', () => {
				const swap = encode({
					type: UNISWAP_COMMANDS.V3_SWAP_EXACT_IN,
					types: V3_SWAP,
					values: [WALLET, 1_000_000n, 1n, `${path(EURC, USDC)}00`, true, []]
				});

				expect(getUniswapSwap(params({ data: execute({ commands: [swap] }) }))).toBeUndefined();
			});

			it('should read the layout of 2.0.0 at a 2.0.0 router only', () => {
				const swap = v3Swap({
					amount: 1_000_000n,
					amountLimit: 1_087_807n,
					types: V3_SWAP.slice(0, 5)
				});

				const data = execute({ commands: [swap] });

				expect(getUniswapSwap(params({ data, to: ROUTER_2_0 }))?.router.version).toBe('2.0.0');
				expect(getUniswapSwap(params({ data }))).toBeUndefined();
				expect(getUniswapSwap(params({ data: eurcToUsdc, to: ROUTER_2_0 }))).toBeUndefined();
			});

			it('should not read a command 2.0.0 does not have at a 2.0.0 router', () => {
				const data = execute({
					commands: [
						v3Swap({
							recipient: UNISWAP_RECIPIENT_ROUTER,
							amount: 1_000_000n,
							amountLimit: ZERO,
							types: V3_SWAP.slice(0, 5)
						}),
						encode({
							type: UNISWAP_COMMANDS.PAY_PORTION_FULL_PRECISION,
							types: ['address', 'address', 'uint256'],
							values: [USDC, OTHER, 10n ** 15n]
						}),
						sweep()
					]
				});

				expect(getUniswapSwap(params({ data, to: ROUTER_2_0 }))).toBeUndefined();
			});
		});
	});
});
