import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import {
	BASE_NETWORK,
	BASE_NETWORK_ID,
	BASE_SEPOLIA_NETWORK
} from '$env/networks/networks-evm/networks.evm.base.env';
import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { POLYGON_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { SOLANA_DEVNET_NETWORK, SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type * as lifiEnv from '$env/rest/lifi.env';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { ROBINHOOD_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-robinhood/tokens.eth.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { ZERO_ETH_ADDRESS } from '$lib/constants/app.constants';
import { LifiQuoteRejectedError } from '$lib/types/errors';
import { SwapProvider } from '$lib/types/swap';
import {
	assertLifiQuote,
	buildLifiQuoteRequest,
	mapLifiSwapResult,
	toLifiChainId,
	toLifiTokenAddress
} from '$lib/utils/lifi-swap.utils';
import { SYSTEM_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
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
import { assertNonNullish } from '@dfinity/utils';
import { ChainId, type LiFiStep } from '@lifi/sdk';

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

		it('should not quote a Solana source', () => {
			expect(
				buildLifiQuoteRequest({
					...baseParams,
					sourceToken: SOLANA_TOKEN,
					destinationToken: mockValidSplToken,
					userAddress: mockSolAddress,
					recipientAddress: mockSolAddress
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
				exchanges
			}: {
				bridges: string[];
				exchanges: string[];
			}) => {
				vi.doMock('$env/rest/lifi.env', async (importOriginal) => ({
					...(await importOriginal<typeof lifiEnv>()),
					LIFI_DENY_BRIDGES: bridges,
					LIFI_DENY_EXCHANGES: exchanges
				}));

				// Network ids are symbols, so the tokens and networks come from the same module graph
				// as the code under test.
				const [{ buildLifiQuoteRequest: build }, base, baseEth, arbitrum, robinhood, robinhoodEth] =
					await Promise.all([
						import('$lib/utils/lifi-swap.utils'),
						import('$env/networks/networks-evm/networks.evm.base.env'),
						import('$env/tokens/tokens-evm/tokens-base/tokens.eth.env'),
						import('$env/networks/networks-evm/networks.evm.arbitrum.env'),
						import('$env/networks/networks-evm/networks.evm.robinhood.env'),
						import('$env/tokens/tokens-evm/tokens-robinhood/tokens.eth.env')
					]);

				return {
					build,
					baseEthToken: baseEth.BASE_ETH_TOKEN,
					robinhoodEthToken: robinhoodEth.ROBINHOOD_ETH_TOKEN,
					usdcOn: (network: typeof base.BASE_NETWORK) => ({ ...mockLifiBaseUsdcToken, network }),
					baseNetwork: base.BASE_NETWORK,
					arbitrumNetwork: arbitrum.ARBITRUM_MAINNET_NETWORK,
					robinhoodNetwork: robinhood.ROBINHOOD_MAINNET_NETWORK
				};
			};

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
	});

	describe('mapLifiSwapResult', () => {
		it('should map the estimate to the offer', () => {
			expect(mapLifiSwapResult(mockLifiQuote)).toStrictEqual({
				provider: SwapProvider.LIFI,
				receiveAmount: 25_003_034n,
				receiveOutMinimum: 24_878_019n,
				swapDetails: mockLifiQuote
			});
		});
	});
});
