import { LIFI_BTC_MIN_AMOUNT_SATOSHIS } from '$btc/constants/lifi.constants';
import { btcAddressToOutputScript } from '$btc/utils/btc-psbt.utils';
import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import {
	BASE_NETWORK,
	BASE_NETWORK_ID,
	BASE_SEPOLIA_NETWORK
} from '$env/networks/networks-evm/networks.evm.base.env';
import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { POLYGON_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { SOLANA_DEVNET_NETWORK, SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type * as lifiEnv from '$env/rest/lifi.env';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { NVDA_TOKEN } from '$env/tokens/tokens-evm/tokens-robinhood/tokens-erc20/tokens.nvda.env';
import { USDG_TOKEN } from '$env/tokens/tokens-evm/tokens-robinhood/tokens-erc20/tokens.usdg.env';
import { ROBINHOOD_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-robinhood/tokens.eth.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_DEVNET_TOKEN, SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { LIFI_FEE_BPS } from '$eth/constants/lifi.constants';
import { ZERO, ZERO_ETH_ADDRESS } from '$lib/constants/app.constants';
import { LifiQuoteRejectedError } from '$lib/types/errors';
import type { LifiTokenRef } from '$lib/types/lifi';
import { SwapProvider } from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import {
	assertLifiQuote,
	buildLifiQuoteRequest,
	buildLifiSupportedDestinations,
	decodeLifiBtcTransaction,
	findLifiIntermediateToken,
	findLifiListedToken,
	lifiFeesUsd,
	lifiUserTokenAddresses,
	mapLifiSwapResult,
	toLifiChainId,
	toLifiTokenAddress
} from '$lib/utils/lifi-swap.utils';
import { SYSTEM_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import {
	mockLifiBtcFeeAddress,
	mockLifiBtcLayerswapQuote,
	mockLifiBtcLayerswapSmallQuote,
	mockLifiBtcNearBelowFloorQuote,
	mockLifiBtcNearQuote
} from '$tests/mocks/lifi-btc.mock';
import {
	mockLifiSolSolToUsdc,
	mockLifiSolUser,
	mockLifiSolWrappedSolUser
} from '$tests/mocks/lifi-sol-transaction.mock';
import {
	mockLifiBaseUsdcAddress,
	mockLifiBaseUsdcToken,
	mockLifiDiamond,
	mockLifiFromAmount,
	mockLifiQuote,
	mockLifiUserAddress
} from '$tests/mocks/lifi.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import { btcSendViaBackend } from '$tests/utils/btc-env.test-utils';
import { assertNonNullish } from '@dfinity/utils';
import {
	ChainId,
	type CrossStep,
	type LiFiStep,
	type ProtocolStep,
	type QuoteRequestFromAmount,
	type Step,
	type SwapStep
} from '@lifi/sdk';
import {
	address,
	blockhash,
	compileTransaction,
	createTransactionMessage,
	getBase64EncodedWireTransaction,
	pipe,
	setTransactionMessageFeePayer,
	setTransactionMessageLifetimeUsingBlockhash
} from '@solana/kit';
import { Psbt } from 'bitcoinjs-lib';

describe('lifi-swap.utils', () => {
	const baseParams = {
		sourceToken: BASE_ETH_TOKEN,
		destinationToken: mockLifiBaseUsdcToken,
		amount: mockLifiFromAmount,
		userAddress: mockLifiUserAddress,
		slippage: 1.5
	};

	describe('toLifiChainId', () => {
		it.each([
			{ network: ETHEREUM_NETWORK, chainId: 1 },
			{ network: ARBITRUM_MAINNET_NETWORK, chainId: 42161 },
			{ network: BSC_MAINNET_NETWORK, chainId: 56 },
			{ network: POLYGON_MAINNET_NETWORK, chainId: 137 },
			{ network: BASE_NETWORK, chainId: 8453 },
			{ network: ROBINHOOD_MAINNET_NETWORK, chainId: 4663 },
			{ network: SOLANA_MAINNET_NETWORK, chainId: ChainId.SOL }
		])('should map $network.name to $chainId', ({ network, chainId }) => {
			expect(toLifiChainId(network)).toBe(chainId);
		});

		it.each([SEPOLIA_NETWORK, BASE_SEPOLIA_NETWORK, SOLANA_DEVNET_NETWORK, ICP_NETWORK])(
			'should not map $name',
			(network) => {
				expect(toLifiChainId(network)).toBeUndefined();
			}
		);
	});

	describe('toLifiTokenAddress', () => {
		it('should use the contract address of an ERC-20 token', () => {
			expect(toLifiTokenAddress(mockLifiBaseUsdcToken)).toBe(mockLifiBaseUsdcAddress);
		});

		it('should use the zero address for an EVM native coin', () => {
			expect(toLifiTokenAddress(ETHEREUM_TOKEN)).toBe(ZERO_ETH_ADDRESS);
			expect(toLifiTokenAddress(BASE_ETH_TOKEN)).toBe(ZERO_ETH_ADDRESS);
		});

		it('should use the mint address of an SPL token', () => {
			expect(toLifiTokenAddress(mockValidSplToken)).toBe(mockValidSplToken.address);
		});

		it('should use the System Program id for native SOL', () => {
			expect(toLifiTokenAddress(SOLANA_TOKEN)).toBe(SYSTEM_PROGRAM_ADDRESS);
		});

		it('should not map an ICP token', () => {
			expect(toLifiTokenAddress(ICP_TOKEN)).toBeUndefined();
		});
	});

	describe('buildLifiQuoteRequest', () => {
		it('should build a same-chain request', () => {
			expect(buildLifiQuoteRequest(baseParams)).toStrictEqual({
				fromChain: 8453,
				toChain: 8453,
				fromToken: ZERO_ETH_ADDRESS,
				toToken: mockLifiBaseUsdcAddress,
				fromAddress: mockLifiUserAddress,
				toAddress: mockLifiUserAddress,
				fromAmount: `${mockLifiFromAmount}`,
				slippage: 0.015,
				order: 'CHEAPEST',
				skipSimulation: true,
				allowDestinationCall: false,
				allowBridges: ['across', 'near']
			});
		});

		it('should convert a percentage slippage given as a string', () => {
			expect(buildLifiQuoteRequest({ ...baseParams, slippage: '0.5' })?.slippage).toBe(0.005);
		});

		it.each(['abc', 0, -1, 100])('should not quote with slippage %s', (slippage) => {
			expect(buildLifiQuoteRequest({ ...baseParams, slippage })).toBeUndefined();
		});

		it('should pay out at the recipient address on another EVM chain', () => {
			const recipientAddress = '0x00000000000000000000000000000000000000aa';

			expect(
				buildLifiQuoteRequest({
					...baseParams,
					destinationToken: { ...mockLifiBaseUsdcToken, network: ARBITRUM_MAINNET_NETWORK },
					recipientAddress
				})
			).toMatchObject({ fromChain: 8453, toChain: 42161, toAddress: recipientAddress });
		});

		it('should fall back to the user address for an EVM destination without a recipient', () => {
			expect(
				buildLifiQuoteRequest({
					...baseParams,
					destinationToken: { ...mockLifiBaseUsdcToken, network: ARBITRUM_MAINNET_NETWORK }
				})?.toAddress
			).toBe(mockLifiUserAddress);
		});

		it('should pay out at the Solana recipient for a Solana destination', () => {
			expect(
				buildLifiQuoteRequest({
					...baseParams,
					destinationToken: mockValidSplToken,
					recipientAddress: mockSolAddress
				})
			).toMatchObject({
				toChain: ChainId.SOL,
				toToken: mockValidSplToken.address,
				toAddress: mockSolAddress
			});
		});

		it('should not quote a Solana destination without a Solana recipient', () => {
			expect(
				buildLifiQuoteRequest({ ...baseParams, destinationToken: mockValidSplToken })
			).toBeUndefined();
		});

		it('should build a Solana → Solana request limited to the exchanges its binding checks', () => {
			expect(
				buildLifiQuoteRequest({
					...baseParams,
					sourceToken: SOLANA_TOKEN,
					destinationToken: mockValidSplToken,
					userAddress: mockSolAddress,
					recipientAddress: mockSolAddress
				})
			).toStrictEqual({
				fromChain: ChainId.SOL,
				toChain: ChainId.SOL,
				fromToken: SYSTEM_PROGRAM_ADDRESS,
				toToken: mockValidSplToken.address,
				fromAddress: mockSolAddress,
				toAddress: mockSolAddress,
				fromAmount: `${mockLifiFromAmount}`,
				slippage: 0.015,
				order: 'CHEAPEST',
				skipSimulation: true,
				allowDestinationCall: false,
				allowExchanges: ['jupiter']
			});
		});

		it('should not quote a Solana source with an EVM destination', () => {
			expect(
				buildLifiQuoteRequest({
					...baseParams,
					sourceToken: SOLANA_TOKEN,
					userAddress: mockSolAddress,
					recipientAddress: mockLifiUserAddress
				})
			).toBeUndefined();
		});

		it('should not quote a Solana source without a Solana recipient', () => {
			expect(
				buildLifiQuoteRequest({
					...baseParams,
					sourceToken: SOLANA_TOKEN,
					destinationToken: mockValidSplToken,
					userAddress: mockSolAddress
				})
			).toBeUndefined();
		});

		it('should not quote without a user address', () => {
			expect(buildLifiQuoteRequest({ ...baseParams, userAddress: undefined })).toBeUndefined();
		});

		it('should not quote a testnet source', () => {
			expect(
				buildLifiQuoteRequest({
					...baseParams,
					sourceToken: SEPOLIA_TOKEN,
					destinationToken: { ...mockLifiBaseUsdcToken, network: SEPOLIA_NETWORK }
				})
			).toBeUndefined();
		});

		it('should not quote a destination LI.FI does not serve', () => {
			expect(buildLifiQuoteRequest({ ...baseParams, destinationToken: ICP_TOKEN })).toBeUndefined();
		});

		it('should limit a Robinhood Chain source to the bridges its Diamond carries', () => {
			expect(
				buildLifiQuoteRequest({ ...baseParams, sourceToken: ROBINHOOD_ETH_TOKEN })?.allowBridges
			).toStrictEqual(['across']);
		});

		describe('with deny lists', () => {
			beforeEach(() => {
				vi.resetModules();
			});

			afterEach(() => {
				vi.doUnmock('$env/rest/lifi.env');
				vi.resetModules();
			});

			const loadWithDenyLists = async ({
				bridges,
				exchanges,
				solanaBridges
			}: {
				bridges: string[];
				exchanges: string[];
				// Bridges allowed from Solana, which has none.
				solanaBridges?: string[];
			}) => {
				vi.doMock('$env/rest/lifi.env', async (importOriginal) => {
					const original = await importOriginal<typeof lifiEnv>();
					const { SOLANA_MAINNET_NETWORK_ID } = await import('$env/networks/networks.sol.env');

					return {
						...original,
						LIFI_DENY_BRIDGES: bridges,
						LIFI_DENY_EXCHANGES: exchanges,
						...(solanaBridges !== undefined && {
							LIFI_ALLOWED_BRIDGES: {
								...original.LIFI_ALLOWED_BRIDGES,
								[SOLANA_MAINNET_NETWORK_ID]: solanaBridges
							}
						})
					};
				});

				// Network ids are symbols, so the tokens and networks come from the same module graph
				// as the code under test.
				const [
					{ buildLifiQuoteRequest: build },
					base,
					baseEth,
					arbitrum,
					robinhood,
					robinhoodEth,
					solNetworks,
					sol
				] = await Promise.all([
					import('$lib/utils/lifi-swap.utils'),
					import('$env/networks/networks-evm/networks.evm.base.env'),
					import('$env/tokens/tokens-evm/tokens-base/tokens.eth.env'),
					import('$env/networks/networks-evm/networks.evm.arbitrum.env'),
					import('$env/networks/networks-evm/networks.evm.robinhood.env'),
					import('$env/tokens/tokens-evm/tokens-robinhood/tokens.eth.env'),
					import('$env/networks/networks.sol.env'),
					import('$env/tokens/tokens.sol.env')
				]);

				return {
					build,
					baseEthToken: baseEth.BASE_ETH_TOKEN,
					robinhoodEthToken: robinhoodEth.ROBINHOOD_ETH_TOKEN,
					usdcOn: (network: typeof base.BASE_NETWORK) => ({ ...mockLifiBaseUsdcToken, network }),
					baseNetwork: base.BASE_NETWORK,
					arbitrumNetwork: arbitrum.ARBITRUM_MAINNET_NETWORK,
					robinhoodNetwork: robinhood.ROBINHOOD_MAINNET_NETWORK,
					solToken: sol.SOLANA_TOKEN,
					splToken: { ...mockValidSplToken, network: solNetworks.SOLANA_MAINNET_NETWORK }
				};
			};

			const solanaParams = {
				...baseParams,
				userAddress: mockSolAddress,
				recipientAddress: mockSolAddress
			};

			it("should drop a denied exchange from a Solana source's allow-list rather than send a deny list", async () => {
				const { build, solToken, splToken } = await loadWithDenyLists({
					bridges: [],
					exchanges: ['someExchange']
				});

				const request = build({
					...solanaParams,
					sourceToken: solToken,
					destinationToken: splToken
				});

				expect(request?.allowExchanges).toStrictEqual(['jupiter']);
				expect(request).not.toHaveProperty('denyExchanges');
			});

			it('should not quote a Solana source with an EVM destination, even through a bridge allowed from Solana', async () => {
				const { build, solToken, usdcOn, baseNetwork } = await loadWithDenyLists({
					bridges: [],
					exchanges: [],
					solanaBridges: ['mayan']
				});

				expect(
					build({
						...solanaParams,
						sourceToken: solToken,
						destinationToken: usdcOn(baseNetwork),
						recipientAddress: mockLifiUserAddress
					})
				).toBeUndefined();
			});

			it('should not quote a Solana source once every exchange its binding checks is denied', async () => {
				const { build, solToken, splToken } = await loadWithDenyLists({
					bridges: [],
					exchanges: ['jupiter']
				});

				expect(
					build({ ...solanaParams, sourceToken: solToken, destinationToken: splToken })
				).toBeUndefined();
			});

			it('should drop a denied bridge from the allow-list rather than send a deny list', async () => {
				const { build, baseEthToken, usdcOn, arbitrumNetwork } = await loadWithDenyLists({
					bridges: ['near'],
					exchanges: []
				});

				const request = build({
					...baseParams,
					sourceToken: baseEthToken,
					destinationToken: usdcOn(arbitrumNetwork)
				});

				expect(request?.allowBridges).toStrictEqual(['across']);
				expect(request).not.toHaveProperty('denyBridges');
			});

			it('should not quote across chains once every bridge of the source Diamond is denied', async () => {
				const { build, robinhoodEthToken, usdcOn, arbitrumNetwork, robinhoodNetwork } =
					await loadWithDenyLists({ bridges: ['across'], exchanges: [] });

				expect(
					build({
						...baseParams,
						sourceToken: robinhoodEthToken,
						destinationToken: usdcOn(arbitrumNetwork)
					})
				).toBeUndefined();

				// A same-chain swap needs no bridge, so it is still quoted, without a bridge list.
				const sameChain = build({
					...baseParams,
					sourceToken: robinhoodEthToken,
					destinationToken: usdcOn(robinhoodNetwork)
				});

				expect(sameChain).toMatchObject({ fromChain: 4663, toChain: 4663 });
				expect(sameChain).not.toHaveProperty('allowBridges');
			});

			it('should send the exchange deny list when it names a tool', async () => {
				const { build, baseEthToken, usdcOn, baseNetwork } = await loadWithDenyLists({
					bridges: [],
					exchanges: ['someExchange']
				});

				expect(
					build({ ...baseParams, sourceToken: baseEthToken, destinationToken: usdcOn(baseNetwork) })
				).toMatchObject({ denyExchanges: ['someExchange'] });
			});
		});

		it('should not quote toward Bitcoin', () => {
			expect(
				buildLifiQuoteRequest({
					...baseParams,
					destinationToken: BTC_MAINNET_TOKEN,
					recipientAddress: mockBtcAddress
				})
			).toBeUndefined();
		});

		describe('a BTC source', () => {
			const recipientAddress = '0x00000000000000000000000000000000000000aa';

			const btcParams = {
				...baseParams,
				sourceToken: BTC_MAINNET_TOKEN,
				destinationToken: ETHEREUM_TOKEN,
				amount: 1_000_000n,
				userAddress: mockBtcAddress,
				recipientAddress
			};

			beforeEach(() => {
				btcSendViaBackend.enabled = true;
			});

			it('should not quote while no bridge is admitted from Bitcoin', () => {
				expect(buildLifiQuoteRequest(btcParams)).toBeUndefined();
			});

			it("should set the floor where LI.FI's 294-sat fee output stops exceeding its fee", () => {
				expect(LIFI_BTC_MIN_AMOUNT_SATOSHIS).toBe(
					(294n * 10_000n + LIFI_FEE_BPS - 1n) / LIFI_FEE_BPS
				);
			});

			describe('with an admitted bridge', () => {
				beforeEach(() => {
					vi.resetModules();
				});

				afterEach(() => {
					vi.doUnmock('$env/rest/lifi.env');
					vi.resetModules();
				});

				const loadWithBtcBridges = async ({
					bridges = ['layerswap'],
					denyBridges = [],
					btcSwapEnabled = true,
					sendViaBackend = true
				}: {
					bridges?: string[];
					denyBridges?: string[];
					btcSwapEnabled?: boolean;
					sendViaBackend?: boolean;
				} = {}) => {
					vi.doMock('$env/rest/lifi.env', async (importOriginal) => {
						const original = await importOriginal<typeof lifiEnv>();
						const { BTC_MAINNET_NETWORK_ID } = await import('$env/networks/networks.btc.env');

						return {
							...original,
							LIFI_BTC_SWAP_ENABLED: btcSwapEnabled,
							LIFI_DENY_BRIDGES: denyBridges,
							LIFI_ALLOWED_BRIDGES: {
								...original.LIFI_ALLOWED_BRIDGES,
								[BTC_MAINNET_NETWORK_ID]: bridges
							}
						};
					});

					// Network ids are symbols, so the tokens come from the same module graph as the code
					// under test.
					const [{ buildLifiQuoteRequest: build }, btcTokens, ethTokens] = await Promise.all([
						import('$lib/utils/lifi-swap.utils'),
						import('$env/tokens/tokens.btc.env'),
						import('$env/tokens/tokens.eth.env')
					]);

					btcSendViaBackend.enabled = sendViaBackend;

					return {
						build,
						params: {
							...btcParams,
							sourceToken: btcTokens.BTC_MAINNET_TOKEN,
							destinationToken: ethTokens.ETHEREUM_TOKEN
						},
						btcTestnetToken: btcTokens.BTC_TESTNET_TOKEN
					};
				};

				it('should quote from the BTC address toward the recipient on the destination network', async () => {
					const { build, params } = await loadWithBtcBridges();

					expect(build(params)).toStrictEqual({
						fromChain: ChainId.BTC,
						toChain: 1,
						fromToken: 'bitcoin',
						toToken: ZERO_ETH_ADDRESS,
						fromAddress: mockBtcAddress,
						toAddress: recipientAddress,
						fromAmount: '1000000',
						slippage: 0.015,
						order: 'CHEAPEST',
						skipSimulation: true,
						allowDestinationCall: false,
						allowBridges: ['layerswap']
					});
				});

				it('should not quote below 117 600 satoshis', async () => {
					const { build, params } = await loadWithBtcBridges();

					expect(build({ ...params, amount: 117_599n })).toBeUndefined();
					expect(build({ ...params, amount: 117_600n })).toMatchObject({ fromAmount: '117600' });
				});

				it('should not stand the BTC address in for a missing recipient', async () => {
					const { build, params } = await loadWithBtcBridges();

					expect(build({ ...params, recipientAddress: undefined })).toBeUndefined();
				});

				it('should not quote without sending through the backend', async () => {
					const { build, params } = await loadWithBtcBridges({ sendViaBackend: false });

					expect(build(params)).toBeUndefined();
				});

				it('should not quote with the LI.FI BTC flag off', async () => {
					const { build, params } = await loadWithBtcBridges({ btcSwapEnabled: false });

					expect(build(params)).toBeUndefined();
				});

				it('should not quote a BTC testnet source', async () => {
					const { build, params, btcTestnetToken } = await loadWithBtcBridges();

					expect(build({ ...params, sourceToken: btcTestnetToken })).toBeUndefined();
				});

				it('should not quote once every admitted bridge is denied', async () => {
					const { build, params } = await loadWithBtcBridges({ denyBridges: ['layerswap'] });

					expect(build(params)).toBeUndefined();
				});
			});
		});
	});

	describe('assertLifiQuote', () => {
		const buildRequest = (params: Parameters<typeof buildLifiQuoteRequest>[0]) => {
			const request = buildLifiQuoteRequest(params);

			assertNonNullish(request);

			return request;
		};

		const request = buildRequest(baseParams);

		const assertQuote = (quote: LiFiStep) =>
			assertLifiQuote({ quote, request, sourceNetworkId: BASE_NETWORK_ID });

		const withAction = (action: Partial<LiFiStep['action']>): LiFiStep => ({
			...mockLifiQuote,
			action: { ...mockLifiQuote.action, ...action }
		});

		const withEstimate = (estimate: Partial<LiFiStep['estimate']>): LiFiStep => ({
			...mockLifiQuote,
			estimate: { ...mockLifiQuote.estimate, ...estimate }
		});

		const withTransaction = (
			transactionRequest: Partial<NonNullable<LiFiStep['transactionRequest']>>
		): LiFiStep => ({
			...mockLifiQuote,
			transactionRequest: { ...mockLifiQuote.transactionRequest, ...transactionRequest }
		});

		it('should accept a quote that answers the request', () => {
			expect(() => assertQuote(mockLifiQuote)).not.toThrow();
		});

		it('should compare EVM addresses without case', () => {
			expect(() =>
				assertQuote({
					...withTransaction({
						to: mockLifiDiamond.toLowerCase(),
						from: mockLifiUserAddress.toLowerCase()
					}),
					estimate: { ...mockLifiQuote.estimate, approvalAddress: mockLifiDiamond.toLowerCase() }
				})
			).not.toThrow();
		});

		it('should refuse a network without a pinned Diamond', () => {
			expect(() =>
				assertLifiQuote({ quote: mockLifiQuote, request, sourceNetworkId: SEPOLIA_NETWORK.id })
			).toThrow(LifiQuoteRejectedError);
		});

		it.each([
			{ field: 'source chain', quote: withAction({ fromChainId: ChainId.ARB }) },
			{ field: 'destination chain', quote: withAction({ toChainId: ChainId.ARB }) },
			{
				field: 'source token',
				quote: withAction({
					fromToken: { ...mockLifiQuote.action.fromToken, address: mockLifiBaseUsdcAddress }
				})
			},
			{
				field: 'destination token',
				quote: withAction({
					toToken: { ...mockLifiQuote.action.toToken, address: ZERO_ETH_ADDRESS }
				})
			},
			{ field: 'amount', quote: withAction({ fromAmount: '1' }) },
			{ field: 'recipient', quote: withAction({ toAddress: mockLifiDiamond }) },
			{ field: 'missing recipient', quote: withAction({ toAddress: undefined }) }
		])('should refuse a quote whose $field differs from the request', ({ quote }) => {
			expect(() => assertQuote(quote)).toThrow(LifiQuoteRejectedError);
		});

		it.each([
			{ estimate: 'a minimum above the amount', quote: withEstimate({ toAmountMin: '25003035' }) },
			{ estimate: 'a zero minimum', quote: withEstimate({ toAmountMin: '0' }) },
			{ estimate: 'an unparsable amount', quote: withEstimate({ toAmount: 'not-a-number' }) },
			{ estimate: 'an empty amount', quote: withEstimate({ toAmount: '' }) }
		])('should refuse $estimate', ({ quote }) => {
			expect(() => assertQuote(quote)).toThrow(LifiQuoteRejectedError);
		});

		it('should refuse a quote without a transaction', () => {
			expect(() => assertQuote({ ...mockLifiQuote, transactionRequest: undefined })).toThrow(
				LifiQuoteRejectedError
			);
		});

		it.each([
			{ field: 'call target', quote: withTransaction({ to: mockLifiUserAddress }) },
			{ field: 'spender', quote: withEstimate({ approvalAddress: mockLifiUserAddress }) },
			{ field: 'chain id', quote: withTransaction({ chainId: ChainId.ARB }) },
			{ field: 'sender', quote: withTransaction({ from: mockLifiDiamond }) },
			{ field: 'calldata', quote: withTransaction({ data: '0x' }) },
			{ field: 'value', quote: withTransaction({ value: '0x0' }) }
		])('should refuse a quote whose $field is not the expected one', ({ quote }) => {
			expect(() => assertQuote(quote)).toThrow(LifiQuoteRejectedError);
		});

		it('should refuse a value on a transaction that spends an ERC-20 token', () => {
			const erc20Request = buildRequest({
				...baseParams,
				sourceToken: mockLifiBaseUsdcToken,
				destinationToken: BASE_ETH_TOKEN,
				amount: 1_000_000n
			});

			const erc20Quote: LiFiStep = {
				...mockLifiQuote,
				action: {
					...mockLifiQuote.action,
					fromAmount: '1000000',
					fromToken: mockLifiQuote.action.toToken,
					toToken: mockLifiQuote.action.fromToken
				},
				transactionRequest: { ...mockLifiQuote.transactionRequest, value: '0x0' }
			};

			expect(() =>
				assertLifiQuote({
					quote: erc20Quote,
					request: erc20Request,
					sourceNetworkId: BASE_NETWORK_ID
				})
			).not.toThrow();

			expect(() =>
				assertLifiQuote({
					quote: {
						...erc20Quote,
						transactionRequest: { ...erc20Quote.transactionRequest, value: '0x1' }
					},
					request: erc20Request,
					sourceNetworkId: BASE_NETWORK_ID
				})
			).toThrow(LifiQuoteRejectedError);
		});

		describe('route tools', () => {
			// One branch per step type, so that each literal narrows to its own member of `Step`.
			const withStep = (
				step: Pick<SwapStep, 'type' | 'tool'> | Pick<CrossStep, 'type' | 'tool'>
			): LiFiStep => ({
				...mockLifiQuote,
				includedSteps: [
					step.type === 'swap' ? { ...mockLifiQuote, ...step } : { ...mockLifiQuote, ...step }
				]
			});

			it('should accept a swap through an exchange that is not denied', () => {
				expect(() => assertQuote(withStep({ type: 'swap', tool: 'nordstern' }))).not.toThrow();
			});

			it('should refuse a swap through a denied exchange', () => {
				expect(() =>
					assertLifiQuote({
						quote: withStep({ type: 'swap', tool: 'nordstern' }),
						request: { ...request, denyExchanges: ['nordstern'] },
						sourceNetworkId: BASE_NETWORK_ID
					})
				).toThrow(LifiQuoteRejectedError);
			});

			it('should refuse a bridge the request did not allow', () => {
				expect(() => assertQuote(withStep({ type: 'cross', tool: 'relay' }))).toThrow(
					LifiQuoteRejectedError
				);
			});

			it('should accept a bridge the request allowed', () => {
				expect(() =>
					assertLifiQuote({
						quote: withStep({ type: 'cross', tool: 'across' }),
						request: { ...request, allowBridges: ['across'] },
						sourceNetworkId: BASE_NETWORK_ID
					})
				).not.toThrow();
			});
		});

		it('should compare a Solana recipient exactly', () => {
			const solanaRequest = buildRequest({
				...baseParams,
				destinationToken: mockValidSplToken,
				recipientAddress: mockSolAddress
			});

			const solanaQuote = (toAddress: string): LiFiStep => ({
				...mockLifiQuote,
				action: {
					...mockLifiQuote.action,
					toChainId: ChainId.SOL,
					toToken: {
						...mockLifiQuote.action.toToken,
						chainId: ChainId.SOL,
						address: mockValidSplToken.address
					},
					toAddress
				}
			});

			expect(() =>
				assertLifiQuote({
					quote: solanaQuote(mockSolAddress),
					request: solanaRequest,
					sourceNetworkId: BASE_NETWORK_ID
				})
			).not.toThrow();

			expect(() =>
				assertLifiQuote({
					quote: solanaQuote(mockSolAddress.toLowerCase()),
					request: solanaRequest,
					sourceNetworkId: BASE_NETWORK_ID
				})
			).toThrow(LifiQuoteRejectedError);
		});

		describe('a Solana source', () => {
			const { request: solRequest, quote: fixtureQuote } = mockLifiSolSolToUsdc;
			const fixtureData = fixtureQuote.transactionRequest?.data;

			const solQuote = ({
				data = fixtureData,
				tool = 'jupiter'
			}: {
				data?: string;
				tool?: string;
			} = {}): LiFiStep => ({
				...mockLifiQuote,
				action: {
					...mockLifiQuote.action,
					fromChainId: ChainId.SOL,
					toChainId: ChainId.SOL,
					fromToken: { ...mockLifiQuote.action.fromToken, address: solRequest.fromToken },
					toToken: { ...mockLifiQuote.action.toToken, address: solRequest.toToken },
					fromAmount: solRequest.fromAmount,
					toAddress: solRequest.toAddress
				},
				estimate: fixtureQuote.estimate,
				includedSteps: [{ ...mockLifiQuote, type: 'swap', tool }],
				transactionRequest: { data }
			});

			const assertSolQuote = ({
				quote = solQuote(),
				request = solRequest
			}: {
				quote?: LiFiStep;
				request?: QuoteRequestFromAmount;
			} = {}) => assertLifiQuote({ quote, request, sourceNetworkId: SOLANA_MAINNET_NETWORK.id });

			// The user's own transaction, but a legacy message.
			const legacyData = getBase64EncodedWireTransaction(
				compileTransaction(
					pipe(
						createTransactionMessage({ version: 'legacy' }),
						(message) => setTransactionMessageFeePayer(address(mockLifiSolUser), message),
						(message) =>
							setTransactionMessageLifetimeUsingBlockhash(
								{
									blockhash: blockhash('HSR6rNUUeh6Grf2mVzP6u33wEfvXeLt7rNaTqkQoFLtN'),
									lastValidBlockHeight: ZERO
								},
								message
							)
					)
				)
			);

			it('should accept a version 0 transaction that only the user signs, with no Diamond', () => {
				expect(() => assertSolQuote()).not.toThrow();
			});

			it('should refuse a list of transactions, which a Jito bundle is', () => {
				const bundle: unknown = [fixtureData, fixtureData];

				expect(() => assertSolQuote({ quote: solQuote({ data: bundle as string }) })).toThrow(
					'not a single transaction'
				);
			});

			it('should refuse a transaction that does not decode', () => {
				expect(() => assertSolQuote({ quote: solQuote({ data: 'not a transaction' }) })).toThrow(
					LifiQuoteRejectedError
				);
			});

			it('should refuse a message other than version 0', () => {
				expect(() => assertSolQuote({ quote: solQuote({ data: legacyData }) })).toThrow(
					'not a version 0 transaction'
				);
			});

			it('should refuse a transaction that someone other than the user signs', () => {
				expect(() =>
					assertSolQuote({
						request: {
							...solRequest,
							fromAddress: mockLifiSolWrappedSolUser,
							toAddress: mockLifiSolWrappedSolUser
						},
						quote: {
							...solQuote(),
							action: { ...solQuote().action, toAddress: mockLifiSolWrappedSolUser }
						}
					})
				).toThrow('the transaction needs a signer other than the user');
			});

			it('should refuse a swap through an exchange outside the requested ones', () => {
				expect(() => assertSolQuote({ quote: solQuote({ tool: 'dflow' }) })).toThrow(
					LifiQuoteRejectedError
				);
			});

			it('should refuse a quote without a transaction', () => {
				expect(() =>
					assertSolQuote({ quote: { ...solQuote(), transactionRequest: undefined } })
				).toThrow(LifiQuoteRejectedError);
			});
		});

		describe('a BTC source', () => {
			const btcRequestOf = ({ action, tool }: LiFiStep): QuoteRequestFromAmount => ({
				fromChain: ChainId.BTC,
				toChain: action.toChainId,
				fromToken: 'bitcoin',
				toToken: action.toToken.address,
				fromAddress: action.fromAddress ?? '',
				toAddress: action.toAddress,
				fromAmount: action.fromAmount,
				slippage: 0.005,
				allowBridges: [tool]
			});

			const assertBtcQuote = ({
				quote = mockLifiBtcLayerswapQuote,
				request = btcRequestOf(mockLifiBtcLayerswapQuote)
			}: {
				quote?: LiFiStep;
				request?: QuoteRequestFromAmount;
			} = {}) => assertLifiQuote({ quote, request, sourceNetworkId: BTC_MAINNET_NETWORK_ID });

			interface Output {
				script: Buffer;
				value: number;
			}

			// The quote with its PSBT's outputs edited, its input kept.
			const withOutputs = ({
				quote = mockLifiBtcLayerswapQuote,
				edit
			}: {
				quote?: LiFiStep;
				edit: (outputs: Output[]) => Output[];
			}): LiFiStep => {
				const original = Psbt.fromHex(quote.transactionRequest?.data ?? '');
				const psbt = new Psbt();

				original.txInputs.forEach(({ hash, index, sequence }, input) =>
					psbt.addInput({
						hash,
						index,
						sequence,
						witnessUtxo: original.data.inputs[input]?.witnessUtxo
					})
				);

				edit(original.txOutputs.map(({ script, value }) => ({ script, value }))).forEach((output) =>
					psbt.addOutput(output)
				);

				return {
					...quote,
					transactionRequest: { ...quote.transactionRequest, data: psbt.toHex() }
				};
			};

			const withFeeCost = (amount: string): LiFiStep => ({
				...mockLifiBtcLayerswapQuote,
				estimate: {
					...mockLifiBtcLayerswapQuote.estimate,
					feeCosts: mockLifiBtcLayerswapQuote.estimate.feeCosts?.map((cost) =>
						cost.name === 'LIFI Fixed Fee' ? { ...cost, amount } : cost
					)
				}
			});

			const scriptOf = (address: string) =>
				Buffer.from(btcAddressToOutputScript({ address, network: 'mainnet' }));

			const memoOf = (hex: string) => Buffer.from(hex, 'hex');

			const [deposit, memo, change, fee] = Psbt.fromHex(
				mockLifiBtcLayerswapQuote.transactionRequest?.data ?? ''
			).txOutputs.map(({ script, value }) => ({ script, value }));

			assertNonNullish(deposit);
			assertNonNullish(memo);
			assertNonNullish(change);
			assertNonNullish(fee);

			it.each([
				{ name: 'LayerSwap', quote: mockLifiBtcLayerswapQuote },
				{ name: 'LayerSwap at 120 000 sats', quote: mockLifiBtcLayerswapSmallQuote },
				{ name: 'NEAR Intents', quote: mockLifiBtcNearQuote }
			])('should accept a live $name quote, with no Diamond', ({ quote }) => {
				expect(() => assertBtcQuote({ quote, request: btcRequestOf(quote) })).not.toThrow();
			});

			it('should refuse a quote below the floor, whose fee output exceeds its quoted fee', () => {
				expect(() =>
					assertBtcQuote({
						quote: mockLifiBtcNearBelowFloorQuote,
						request: btcRequestOf(mockLifiBtcNearBelowFloorQuote)
					})
				).toThrow("LI.FI transaction rejected: LI.FI's fee output is not its quoted fee");
			});

			it('should run the request checks first', () => {
				expect(() =>
					assertBtcQuote({
						quote: {
							...mockLifiBtcLayerswapQuote,
							action: { ...mockLifiBtcLayerswapQuote.action, fromAmount: '2000000' }
						}
					})
				).toThrow('amount differs from the request');
			});

			it('should accept a quote whose PSBT has no change', () => {
				expect(() =>
					assertBtcQuote({ quote: withOutputs({ edit: () => [deposit, memo, fee] }) })
				).not.toThrow();
			});

			it.each([
				{ name: 'a fee before the change', outputs: [deposit, memo, fee, change] },
				{ name: 'a memo before the deposit', outputs: [memo, deposit, change, fee] },
				{ name: 'no memo', outputs: [deposit, change, fee] },
				{ name: 'two memos', outputs: [deposit, memo, memo, fee] },
				{ name: 'two changes', outputs: [deposit, memo, change, change, fee] },
				{ name: 'no fee', outputs: [deposit, memo, change] },
				{
					name: 'an output to someone else',
					outputs: [
						deposit,
						memo,
						{ ...change, script: scriptOf(mockLifiBtcNearQuote.transactionRequest?.to ?? '') },
						fee
					]
				},
				{
					name: 'a fee to another address',
					outputs: [deposit, memo, change, { ...fee, script: scriptOf(mockBtcAddress) }]
				}
			])('should refuse $name', ({ outputs }) => {
				expect(() => assertBtcQuote({ quote: withOutputs({ edit: () => outputs }) })).toThrow(
					'its outputs are not the deposit, the memo, the change and the fee, in that order'
				);
			});

			it('should refuse a deposit to another address than the quote names', () => {
				expect(() =>
					assertBtcQuote({
						quote: {
							...mockLifiBtcLayerswapQuote,
							transactionRequest: {
								...mockLifiBtcLayerswapQuote.transactionRequest,
								to: mockLifiBtcNearQuote.transactionRequest?.to
							}
						}
					})
				).toThrow('its outputs are not the deposit, the memo, the change and the fee');
			});

			it.each([
				{ name: 'a valued memo', memo: { ...memo, value: 1 } },
				{
					name: 'a memo of 81 bytes',
					memo: { script: memoOf(`6a4c51${'ab'.repeat(81)}`), value: 0 }
				},
				{ name: 'a memo with an opcode', memo: { script: memoOf('6a0161ac'), value: 0 } },
				{ name: 'a truncated memo', memo: { script: memoOf('6a04abcd'), value: 0 } }
			])('should refuse $name', ({ memo: badMemo }) => {
				expect(() =>
					assertBtcQuote({ quote: withOutputs({ edit: () => [deposit, badMemo, change, fee] }) })
				).toThrow('the memo is not one the backend broadcasts');
			});

			it('should accept a memo of 80 bytes', () => {
				expect(() =>
					assertBtcQuote({
						quote: withOutputs({
							edit: () => [
								deposit,
								{ script: memoOf(`6a4c50${'ab'.repeat(80)}`), value: 0 },
								change,
								fee
							]
						})
					})
				).not.toThrow();
			});

			it('should refuse a deposit other than the amount less the fee', () => {
				expect(() =>
					assertBtcQuote({
						quote: withOutputs({
							edit: () => [{ ...deposit, value: deposit.value - 1 }, memo, change, fee]
						})
					})
				).toThrow("the deposit is not the amount less LI.FI's fee");
			});

			it('should refuse a fee output other than the quoted fee', () => {
				expect(() =>
					assertBtcQuote({
						quote: withOutputs({ edit: () => [deposit, memo, change, { ...fee, value: 2_499 }] })
					})
				).toThrow("LI.FI's fee output is not its quoted fee");
			});

			it('should refuse a quoted fee above 25 bps, even when the outputs match it', () => {
				expect(() =>
					assertBtcQuote({
						quote: withOutputs({
							quote: withFeeCost('2501'),
							edit: () => [
								{ ...deposit, value: deposit.value - 1 },
								memo,
								change,
								{ ...fee, value: 2_501 }
							]
						})
					})
				).toThrow("LI.FI's fee output is not its quoted fee of at most 25 bps");
			});

			it.each([
				{
					name: 'no LI.FI fee',
					feeCosts: mockLifiBtcLayerswapQuote.estimate.feeCosts?.filter(
						({ name }) => name !== 'LIFI Fixed Fee'
					)
				},
				{
					name: 'two LI.FI fees',
					feeCosts: [
						...(mockLifiBtcLayerswapQuote.estimate.feeCosts ?? []),
						...(mockLifiBtcLayerswapQuote.estimate.feeCosts ?? []).filter(
							({ name }) => name === 'LIFI Fixed Fee'
						)
					]
				},
				{
					name: 'a LI.FI fee charged on top',
					feeCosts: mockLifiBtcLayerswapQuote.estimate.feeCosts?.map((cost) =>
						cost.name === 'LIFI Fixed Fee' ? { ...cost, included: false } : cost
					)
				}
			])('should refuse a quote listing $name', ({ feeCosts }) => {
				expect(() =>
					assertBtcQuote({
						quote: {
							...mockLifiBtcLayerswapQuote,
							estimate: { ...mockLifiBtcLayerswapQuote.estimate, feeCosts }
						}
					})
				).toThrow("LI.FI's fee output is not its quoted fee");
			});

			it('should refuse a quote whose user is LI.FI', () => {
				expect(() =>
					assertBtcQuote({
						request: {
							...btcRequestOf(mockLifiBtcLayerswapQuote),
							fromAddress: mockLifiBtcFeeAddress
						}
					})
				).toThrow('the deposit, the user and LI.FI share an address');
			});

			it('should refuse a deposit address that is not a mainnet Bitcoin address', () => {
				expect(() =>
					assertBtcQuote({
						quote: {
							...mockLifiBtcLayerswapQuote,
							transactionRequest: {
								...mockLifiBtcLayerswapQuote.transactionRequest,
								to: mockLifiUserAddress
							}
						}
					})
				).toThrow('the deposit or the user address is not a Bitcoin address');
			});

			it('should refuse a transaction that does not decode', () => {
				expect(() =>
					assertBtcQuote({
						quote: {
							...mockLifiBtcLayerswapQuote,
							transactionRequest: {
								...mockLifiBtcLayerswapQuote.transactionRequest,
								data: '0xdeadbeef'
							}
						}
					})
				).toThrow('LI.FI transaction rejected: it does not decode');
			});

			it('should refuse a bridge outside the requested ones', () => {
				expect(() =>
					assertBtcQuote({
						request: { ...btcRequestOf(mockLifiBtcLayerswapQuote), allowBridges: ['near'] }
					})
				).toThrow('route uses a bridge or exchange outside the requested lists');
			});
		});
	});

	describe('decodeLifiBtcTransaction', () => {
		const decode = (quote: LiFiStep) =>
			decodeLifiBtcTransaction({
				quote,
				amount: BigInt(quote.action.fromAmount),
				userAddress: quote.action.fromAddress ?? ''
			});

		const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex');

		it("should return LayerSwap's P2TR deposit, its memo and LI.FI's fee, byte for byte", () => {
			const { deposit, memo, fee } = decode(mockLifiBtcLayerswapQuote);

			expect({
				deposit: { script: hex(deposit.script), value: deposit.value },
				memo: { script: hex(memo.script), value: memo.value },
				fee: { script: hex(fee.script), value: fee.value }
			}).toStrictEqual({
				deposit: {
					script: '5120f9ba507bc8114718a0e16d70a22059162f24a7996ac4d1db1f26330c91c761de',
					value: 997_500n
				},
				memo: { script: '6a12313731363366323b3d7c6c6966693df52ece', value: ZERO },
				fee: { script: '00149ab105ce5f65cc9d3e51e4b2403eef1831eb5bfd', value: 2_500n }
			});
		});

		it("should return NEAR's P2WPKH deposit and LI.FI's memo", () => {
			const { deposit, memo } = decode(mockLifiBtcNearQuote);

			expect(hex(deposit.script)).toBe(
				hex(
					btcAddressToOutputScript({
						address: 'bc1qlmjtn55ft9w94ujc8lz8wtyt2fdq40tnfum24l',
						network: 'mainnet'
					})
				)
			);
			expect(deposit.value).toBe(997_500n);
			expect(hex(memo.script)).toBe('6a0a3d7c6c6966692fa4b95a');
		});
	});

	describe('buildLifiSupportedDestinations', () => {
		const destinations = ({
			registry,
			sourceToken
		}: {
			registry: 'evm' | 'sol';
			sourceToken: Token;
		}) =>
			buildLifiSupportedDestinations(registry)({
				sourceToken,
				supportedSourceTokens: undefined,
				findProviderSourceTokens: () => undefined
			});

		it.each([BASE_ETH_TOKEN, mockLifiBaseUsdcToken, ROBINHOOD_ETH_TOKEN])(
			'should offer every EVM destination from the EVM registry for $symbol on $network.name',
			(sourceToken) => {
				expect(destinations({ registry: 'evm', sourceToken })).toStrictEqual({ evm: 'any' });
			}
		);

		it.each([BASE_ETH_TOKEN, SOLANA_TOKEN, mockValidSplToken])(
			'should offer every Solana destination from the Solana registry for $symbol on $network.name',
			(sourceToken) => {
				expect(destinations({ registry: 'sol', sourceToken })).toStrictEqual({ sol: 'any' });
			}
		);

		it.each([
			{ registry: 'evm' as const, sourceToken: SOLANA_TOKEN },
			{ registry: 'evm' as const, sourceToken: mockValidSplToken },
			{ registry: 'sol' as const, sourceToken: SOLANA_DEVNET_TOKEN },
			{ registry: 'evm' as const, sourceToken: SEPOLIA_TOKEN },
			{ registry: 'sol' as const, sourceToken: SEPOLIA_TOKEN },
			{ registry: 'evm' as const, sourceToken: ICP_TOKEN }
		])(
			'should offer nothing from the $registry registry for $sourceToken.symbol on $sourceToken.network.name',
			({ registry, sourceToken }) => {
				expect(destinations({ registry, sourceToken })).toBeUndefined();
			}
		);
	});

	describe('lifiFeesUsd', () => {
		const feeCost = (amountUSD: string) => ({
			name: 'LIFI Fixed Fee',
			description: 'Fixed LI.FI fee',
			percentage: '0.0025',
			token: mockLifiQuote.action.fromToken,
			amount: '25000000000000',
			amountUSD,
			included: true
		});

		const withFees = (feeCosts: LiFiStep['estimate']['feeCosts']): LiFiStep => ({
			...mockLifiQuote,
			estimate: { ...mockLifiQuote.estimate, feeCosts }
		});

		it('should sum the fees in USD, all taken out of the receive amount', () => {
			expect(lifiFeesUsd(withFees([feeCost('0.0625'), feeCost('0.5')]))).toBe(0.5625);
		});

		it('should count a zero fee as zero', () => {
			expect(lifiFeesUsd(withFees([feeCost('0.0625'), feeCost('0')]))).toBe(0.0625);
		});

		it.each([
			{ case: 'no fee list', feeCosts: undefined },
			{ case: 'an empty fee list', feeCosts: [] },
			{ case: 'a non-numeric amount', feeCosts: [feeCost('0.0625'), feeCost('n/a')] },
			// `Number` reads both as zero, which would understate the total.
			{ case: 'an empty amount', feeCosts: [feeCost('0.0625'), feeCost('')] },
			{ case: 'a blank amount', feeCosts: [feeCost('0.0625'), feeCost('  ')] },
			{ case: 'an amount in exponent notation', feeCosts: [feeCost('0.0625'), feeCost('1e-7')] },
			// Neither deducted from the receive amount nor the whole extra cost: the row would not add up.
			{
				case: 'a fee charged on top of the amount sent',
				feeCosts: [feeCost('0.0625'), { ...feeCost('0.5'), included: false }]
			}
		])('should report nothing for $case', ({ feeCosts }) => {
			expect(lifiFeesUsd(withFees(feeCosts))).toBeUndefined();
		});
	});

	describe('mapLifiSwapResult', () => {
		it('should map the estimate to the offer, with the request the quote answers', () => {
			const request = { fromChain: ChainId.BAS } as QuoteRequestFromAmount;

			expect(mapLifiSwapResult({ quote: mockLifiQuote, request })).toStrictEqual({
				provider: SwapProvider.LIFI,
				receiveAmount: 25_003_034n,
				receiveOutMinimum: 24_878_019n,
				swapDetails: mockLifiQuote,
				request
			});
		});
	});

	describe('lifiUserTokenAddresses', () => {
		const baseVault = { ...mockValidErc4626Token, network: BASE_NETWORK };

		it('should list every ERC-20 and ERC-4626 of the network, a disabled one too', () => {
			expect(
				lifiUserTokenAddresses({
					tokens: [
						{ ...mockLifiBaseUsdcToken, enabled: false },
						baseVault,
						BASE_ETH_TOKEN,
						ETHEREUM_TOKEN,
						{ ...mockLifiBaseUsdcToken, network: ARBITRUM_MAINNET_NETWORK, address: '0xA1' }
					] as Token[],
					networkId: BASE_NETWORK_ID
				})
			).toEqual([mockLifiBaseUsdcAddress, baseVault.address]);
		});
	});

	describe('findLifiIntermediateToken', () => {
		const baseEth = { chainId: ChainId.BAS, address: ZERO_ETH_ADDRESS };
		const baseUsdc = { chainId: ChainId.BAS, address: mockLifiBaseUsdcAddress };
		const baseDai = { chainId: ChainId.BAS, address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb' };
		const baseWeth = {
			chainId: ChainId.BAS,
			address: '0x4200000000000000000000000000000000000006'
		};
		const robinhoodUsdg = { chainId: ChainId.OUT, address: USDG_TOKEN.address };
		const robinhoodNvda = { chainId: ChainId.OUT, address: NVDA_TOKEN.address };
		const robinhoodWeth = {
			chainId: ChainId.OUT,
			address: '0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73'
		};

		const lifiToken = ({ chainId, address }: LifiTokenRef) => ({
			...mockLifiQuote.action.toToken,
			chainId,
			address
		});

		const action = ({ from, to }: { from: LifiTokenRef; to: LifiTokenRef }) => ({
			...mockLifiQuote.action,
			fromChainId: from.chainId,
			toChainId: to.chainId,
			fromToken: lifiToken(from),
			toToken: lifiToken(to)
		});

		// One branch per step type, so that each literal narrows to its own member of `Step`.
		const step = ({
			type,
			tool,
			from,
			to
		}: (
			| Pick<SwapStep, 'type' | 'tool'>
			| Pick<CrossStep, 'type' | 'tool'>
			| Pick<ProtocolStep, 'type' | 'tool'>
		) & {
			from: LifiTokenRef;
			to: LifiTokenRef;
		}): Step =>
			type === 'swap'
				? { ...mockLifiQuote, type, tool, action: action({ from, to }) }
				: type === 'cross'
					? { ...mockLifiQuote, type, tool, action: action({ from, to }) }
					: { ...mockLifiQuote, type, tool, action: action({ from, to }) };

		const feeCollection = (token: LifiTokenRef): Step =>
			step({ type: 'protocol', tool: 'feeCollection', from: token, to: token });

		const route = ({
			from,
			to,
			includedSteps
		}: {
			from: LifiTokenRef;
			to: LifiTokenRef;
			includedSteps: Step[];
		}): LiFiStep => ({ ...mockLifiQuote, action: action({ from, to }), includedSteps });

		// USDC (Base) → NVDA (Robinhood Chain), as LI.FI routed it on 2026-10-26.
		const swapAfterBridge = route({
			from: baseUsdc,
			to: robinhoodNvda,
			includedSteps: [
				feeCollection(baseUsdc),
				step({ type: 'cross', tool: 'across', from: baseUsdc, to: robinhoodUsdg }),
				step({ type: 'swap', tool: 'smartDeposits', from: robinhoodUsdg, to: robinhoodNvda })
			]
		});

		it('should name the token a route swaps from after the bridge', () => {
			expect(findLifiIntermediateToken(swapAfterBridge)).toStrictEqual(robinhoodUsdg);
		});

		it('should name the token a route swaps to before the bridge', () => {
			expect(
				findLifiIntermediateToken(
					route({
						from: baseDai,
						to: robinhoodUsdg,
						includedSteps: [
							feeCollection(baseDai),
							step({ type: 'swap', tool: 'bitget', from: baseDai, to: baseUsdc }),
							step({ type: 'cross', tool: 'across', from: baseUsdc, to: robinhoodUsdg })
						]
					})
				)
			).toStrictEqual(baseUsdc);
		});

		it('should name none for a route that bridges straight to the destination', () => {
			expect(
				findLifiIntermediateToken(
					route({
						from: baseUsdc,
						to: robinhoodUsdg,
						includedSteps: [
							feeCollection(baseUsdc),
							step({ type: 'cross', tool: 'across', from: baseUsdc, to: robinhoodUsdg })
						]
					})
				)
			).toBeUndefined();
		});

		// ETH (Base) → NVDA, as LI.FI routed it on 2026-10-26: wrapped on Base, bridged as WETH.
		it('should name none for a route through two tokens, a wrapped coin counting as one', () => {
			expect(
				findLifiIntermediateToken(
					route({
						from: baseEth,
						to: robinhoodNvda,
						includedSteps: [
							feeCollection(baseEth),
							step({ type: 'protocol', tool: 'wrapper', from: baseEth, to: baseWeth }),
							step({ type: 'cross', tool: 'across', from: baseWeth, to: robinhoodWeth }),
							step({ type: 'swap', tool: 'kyberswap', from: robinhoodWeth, to: robinhoodNvda })
						]
					})
				)
			).toBeUndefined();
		});

		it('should name no wrapped native coin on the destination side of the bridge', () => {
			expect(
				findLifiIntermediateToken(
					route({
						from: baseUsdc,
						to: robinhoodNvda,
						includedSteps: [
							step({ type: 'cross', tool: 'across', from: baseUsdc, to: robinhoodWeth }),
							step({ type: 'swap', tool: 'kyberswap', from: robinhoodWeth, to: robinhoodNvda })
						]
					})
				)
			).toBeUndefined();
		});

		it('should name none for a route that does not end in the destination', () => {
			expect(
				findLifiIntermediateToken(
					route({
						from: baseUsdc,
						to: robinhoodNvda,
						includedSteps: [
							step({ type: 'cross', tool: 'across', from: baseUsdc, to: robinhoodUsdg })
						]
					})
				)
			).toBeUndefined();
		});

		it('should name none for a route without steps', () => {
			expect(findLifiIntermediateToken({ ...swapAfterBridge, includedSteps: [] })).toBeUndefined();
		});

		it('should name none for a route on one network', () => {
			expect(
				findLifiIntermediateToken(
					route({
						from: baseEth,
						to: baseUsdc,
						includedSteps: [
							step({ type: 'protocol', tool: 'wrapper', from: baseEth, to: baseWeth }),
							step({ type: 'swap', tool: 'nordstern', from: baseWeth, to: baseUsdc })
						]
					})
				)
			).toBeUndefined();
		});

		it('should name none for a route to Solana', () => {
			const solanaUsdc = { chainId: ChainId.SOL, address: mockValidSplToken.address };
			const solanaSol = { chainId: ChainId.SOL, address: SYSTEM_PROGRAM_ADDRESS };

			expect(
				findLifiIntermediateToken(
					route({
						from: baseUsdc,
						to: solanaSol,
						includedSteps: [
							step({ type: 'cross', tool: 'near', from: baseUsdc, to: solanaUsdc }),
							step({ type: 'swap', tool: 'jupiter', from: solanaUsdc, to: solanaSol })
						]
					})
				)
			).toBeUndefined();
		});

		it('should name none for a route from Bitcoin', () => {
			const bitcoin = { chainId: ChainId.BTC, address: 'bitcoin' };

			expect(
				findLifiIntermediateToken(
					route({
						from: bitcoin,
						to: robinhoodNvda,
						includedSteps: [
							step({ type: 'cross', tool: 'layerswap', from: bitcoin, to: robinhoodUsdg }),
							step({ type: 'swap', tool: 'kyberswap', from: robinhoodUsdg, to: robinhoodNvda })
						]
					})
				)
			).toBeUndefined();
		});
	});

	describe('findLifiListedToken', () => {
		const tokens = [
			BASE_ETH_TOKEN,
			ROBINHOOD_ETH_TOKEN,
			{ ...USDG_TOKEN, enabled: false },
			NVDA_TOKEN
		] as Token[];

		it('should find a listed token by its address within its network, enabled or not', () => {
			expect(
				findLifiListedToken({
					tokens,
					token: { chainId: ChainId.OUT, address: USDG_TOKEN.address.toLowerCase() }
				})
			).toBe(tokens[2]);
		});

		it("should find a network's native coin by the zero address", () => {
			expect(
				findLifiListedToken({
					tokens,
					token: { chainId: ChainId.OUT, address: ZERO_ETH_ADDRESS }
				})
			).toBe(ROBINHOOD_ETH_TOKEN);
		});

		it('should find no token another network lists at the same address', () => {
			expect(
				findLifiListedToken({
					tokens,
					token: { chainId: ChainId.BAS, address: USDG_TOKEN.address }
				})
			).toBeUndefined();
		});

		it('should find no token by its symbol alone', () => {
			// The second USDG on Robinhood Chain, which OISY does not list.
			expect(
				findLifiListedToken({
					tokens,
					token: { chainId: ChainId.OUT, address: '0x0A3B763d66c0e8c7555c986A3701E1DC1Bf3954F' }
				})
			).toBeUndefined();
		});
	});
});
