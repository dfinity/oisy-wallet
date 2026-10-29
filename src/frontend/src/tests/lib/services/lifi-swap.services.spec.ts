import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import type * as lifiEnv from '$env/rest/lifi.env';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { NVDA_TOKEN } from '$env/tokens/tokens-evm/tokens-robinhood/tokens-erc20/tokens.nvda.env';
import { USDG_TOKEN } from '$env/tokens/tokens-evm/tokens-robinhood/tokens-erc20/tokens.usdg.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import {
	LIFI_QUOTE_REFRESH_INTERVAL_MS,
	LIFI_QUOTE_TIMEOUT_MS
} from '$lib/constants/swap.constants';
import type * as tokensDerived from '$lib/derived/tokens.derived';
import { tokens } from '$lib/derived/tokens.derived';
import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENT_SEVERITIES,
	PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import { fetchLifiQuote } from '$lib/rest/lifi.rest';
import { trackEvent } from '$lib/services/analytics.services';
import { loadLifiSolQuoteCeiling } from '$lib/services/lifi-sol-transaction.services';
import { fetchLifiSwapQuote, resetLifiQuoteCache } from '$lib/services/lifi-swap.services';
import {
	LifiQuoteRejectedError,
	LifiRouteUnsupportedError,
	SwapViaIntermediateTokenError
} from '$lib/types/errors';
import type { LifiTokenRef } from '$lib/types/lifi';
import { SwapProvider } from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockLifiSolSolToUsdc, mockLifiSolUser } from '$tests/mocks/lifi-sol-transaction.mock';
import {
	mockLifiBaseUsdcAddress,
	mockLifiBaseUsdcToken,
	mockLifiFromAmount,
	mockLifiQuote,
	mockLifiUserAddress
} from '$tests/mocks/lifi.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import { nonNullish } from '@dfinity/utils';
import {
	ChainId,
	HTTPError,
	SDKError,
	type CrossStep,
	type LiFiStep,
	type ProtocolStep,
	type QuoteRequestFromAmount,
	type Step,
	type SwapStep
} from '@lifi/sdk';
import type { Writable } from 'svelte/store';

vi.mock('$env/rest/lifi.env', async (importOriginal) => ({
	...(await importOriginal<typeof lifiEnv>()),
	LIFI_INTEGRATOR: 'oisy-test'
}));

vi.mock('$lib/derived/tokens.derived', async (importOriginal) => {
	const { writable } = await import('svelte/store');

	return {
		...(await importOriginal<typeof tokensDerived>()),
		tokens: writable([])
	};
});

vi.mock('$lib/rest/lifi.rest', () => ({
	fetchLifiQuote: vi.fn()
}));

vi.mock('$lib/services/lifi-sol-transaction.services', () => ({
	loadLifiSolQuoteCeiling: vi.fn()
}));

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('lifi-swap.services', () => {
	const params = {
		sourceToken: BASE_ETH_TOKEN,
		destinationToken: mockLifiBaseUsdcToken,
		amount: mockLifiFromAmount,
		userAddress: mockLifiUserAddress,
		slippage: 1.5
	};

	const httpFailure = (status: number) =>
		new SDKError(new HTTPError(new Response('{}', { status }), 'https://li.quest/v1/quote', {}));

	const now = new Date('2026-10-14T10:00:00Z').getTime();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(now);

		resetLifiQuoteCache();

		vi.mocked(fetchLifiQuote).mockResolvedValue(mockLifiQuote);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('fetchLifiSwapQuote', () => {
		it('reports participation before pricing, including shared and cached quotes', async () => {
			const onProviderParticipating = vi.fn();
			const observed = { ...params, onProviderParticipating };
			const first = fetchLifiSwapQuote(observed);

			expect(onProviderParticipating).toHaveBeenCalledExactlyOnceWith(SwapProvider.LIFI);

			await Promise.all([first, fetchLifiSwapQuote(observed)]);
			await fetchLifiSwapQuote(observed);

			expect(onProviderParticipating).toHaveBeenCalledTimes(3);
			expect(fetchLifiQuote).toHaveBeenCalledOnce();
		});

		it('does not report an ineligible Solana source as participating', async () => {
			const onProviderParticipating = vi.fn();
			await fetchLifiSwapQuote({
				...params,
				sourceToken: SOLANA_TOKEN,
				destinationToken: mockValidSplToken,
				userAddress: mockSolAddress,
				onProviderParticipating
			});

			expect(onProviderParticipating).not.toHaveBeenCalled();
			expect(fetchLifiQuote).not.toHaveBeenCalled();
		});

		it('should return the offer of a quote that answers the request', async () => {
			await expect(fetchLifiSwapQuote(params)).resolves.toStrictEqual({
				provider: SwapProvider.LIFI,
				receiveAmount: 25_003_034n,
				receiveOutMinimum: 24_878_019n,
				swapDetails: mockLifiQuote,
				request: expect.objectContaining({ fromChain: 8453, toChain: 8453 })
			});

			expect(fetchLifiQuote).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					fromChain: 8453,
					toChain: 8453,
					fromAddress: mockLifiUserAddress,
					fromAmount: `${mockLifiFromAmount}`,
					skipSimulation: true,
					allowDestinationCall: false,
					signal: expect.any(AbortSignal)
				})
			);
		});

		it('should not request a quote for a pair LI.FI is not asked about', async () => {
			await expect(
				fetchLifiSwapQuote({
					...params,
					sourceToken: SOLANA_TOKEN,
					userAddress: mockSolAddress,
					recipientAddress: mockLifiUserAddress
				})
			).resolves.toBeUndefined();

			expect(fetchLifiQuote).not.toHaveBeenCalled();
		});

		it('should not read a Solana ceiling for an EVM source', async () => {
			await fetchLifiSwapQuote(params);

			expect(loadLifiSolQuoteCeiling).not.toHaveBeenCalled();
		});

		describe('a Solana source', () => {
			const { request: fixtureRequest, quote: fixtureQuote } = mockLifiSolSolToUsdc;

			const solParams = {
				sourceToken: SOLANA_TOKEN,
				destinationToken: { ...mockValidSplToken, address: fixtureRequest.toToken },
				amount: BigInt(fixtureRequest.fromAmount),
				userAddress: mockLifiSolUser,
				recipientAddress: mockLifiSolUser,
				slippage: 0.5
			};

			// The fixture's transaction, in a quote that echoes the request.
			const solQuote: LiFiStep = {
				...mockLifiQuote,
				action: {
					...mockLifiQuote.action,
					fromChainId: ChainId.SOL,
					toChainId: ChainId.SOL,
					fromToken: { ...mockLifiQuote.action.fromToken, address: fixtureRequest.fromToken },
					toToken: { ...mockLifiQuote.action.toToken, address: fixtureRequest.toToken },
					fromAmount: fixtureRequest.fromAmount,
					toAddress: mockLifiSolUser
				},
				estimate: fixtureQuote.estimate,
				includedSteps: [{ ...mockLifiQuote, type: 'swap', tool: 'jupiter' }],
				transactionRequest: fixtureQuote.transactionRequest
			};

			beforeEach(() => {
				vi.mocked(fetchLifiQuote).mockResolvedValue(solQuote);
				vi.mocked(loadLifiSolQuoteCeiling).mockResolvedValue(380_000n);
			});

			it('should ask LI.FI with the exchanges its binding checks, and carry the ceiling of its transaction', async () => {
				await expect(fetchLifiSwapQuote(solParams)).resolves.toStrictEqual({
					provider: SwapProvider.LIFI,
					receiveAmount: BigInt(fixtureQuote.estimate.toAmount),
					receiveOutMinimum: mockLifiSolSolToUsdc.toAmountMin,
					swapDetails: solQuote,
					request: expect.objectContaining({ fromChain: ChainId.SOL, allowExchanges: ['jupiter'] }),
					solFeeCeiling: 380_000n
				});

				expect(loadLifiSolQuoteCeiling).toHaveBeenCalledExactlyOnceWith({
					quote: solQuote,
					request: expect.objectContaining({ fromChain: ChainId.SOL, toChain: ChainId.SOL })
				});
			});

			it('should not read the ceiling of a quote that fails the trust checks', async () => {
				vi.mocked(fetchLifiQuote).mockResolvedValue({
					...solQuote,
					includedSteps: [{ ...mockLifiQuote, type: 'swap', tool: 'dflow' }]
				});

				await expect(fetchLifiSwapQuote(solParams)).resolves.toBeUndefined();

				expect(loadLifiSolQuoteCeiling).not.toHaveBeenCalled();
			});

			it.each([
				{
					reason: 'a transaction its binding refuses, as a rejected quote',
					err: new LifiRouteUnsupportedError('refused', {
						cause: new LifiQuoteRejectedError('LI.FI transaction rejected: x')
					}),
					type: PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES.QUOTE_REJECTED,
					severity: PLAUSIBLE_EVENT_SEVERITIES.ERROR
				},
				{
					reason: 'a route OISY cannot take, as no route',
					err: new LifiRouteUnsupportedError('unsupported'),
					type: PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES.NO_ROUTE,
					severity: undefined
				},
				{
					reason: 'a route whose chain reads fail, as a failed request',
					err: new Error('rpc down'),
					type: PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES.REQUEST_FAILED,
					severity: PLAUSIBLE_EVENT_SEVERITIES.WARN
				}
			])('should not offer $reason', async ({ err, type, severity }) => {
				vi.mocked(loadLifiSolQuoteCeiling).mockRejectedValue(err);

				await expect(fetchLifiSwapQuote(solParams)).resolves.toBeUndefined();

				const [[{ metadata }]] = vi.mocked(trackEvent).mock.calls;

				expect(metadata).toEqual(expect.objectContaining({ result_error_type: type }));
				expect(metadata?.event_severity).toBe(severity);
			});

			describe('a ceiling read that outlasts the deadline', () => {
				let deadline: AbortController;

				const timedOut = () =>
					deadline.abort(new DOMException('The operation timed out.', 'TimeoutError'));

				beforeEach(() => {
					deadline = new AbortController();
					vi.spyOn(AbortSignal, 'timeout').mockReturnValueOnce(deadline.signal);
					vi.mocked(loadLifiSolQuoteCeiling).mockReturnValueOnce(new Promise(() => undefined));
				});

				afterEach(() => {
					vi.mocked(AbortSignal.timeout).mockRestore();
				});

				it('should settle without an offer at the deadline, tracked as a timeout', async () => {
					const quote = fetchLifiSwapQuote(solParams);

					timedOut();

					await expect(quote).resolves.toBeUndefined();

					expect(trackEvent).toHaveBeenCalledWith(
						expect.objectContaining({
							metadata: expect.objectContaining({
								result_error_type: PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES.TIMEOUT,
								event_severity: PLAUSIBLE_EVENT_SEVERITIES.WARN
							})
						})
					);
				});

				it('should not hold a later request for the same inputs', async () => {
					const first = fetchLifiSwapQuote(solParams);

					timedOut();
					await first;

					vi.setSystemTime(now + LIFI_QUOTE_REFRESH_INTERVAL_MS);

					await expect(fetchLifiSwapQuote(solParams)).resolves.toMatchObject({
						solFeeCeiling: 380_000n
					});
				});
			});
		});

		describe('a cross-chain route', () => {
			const arbitrumUsdc = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

			const crossChainParams = {
				...params,
				destinationToken: {
					...mockLifiBaseUsdcToken,
					id: parseTokenId('LifiArbitrumUsdc'),
					network: ARBITRUM_MAINNET_NETWORK,
					address: arbitrumUsdc
				}
			};

			// One branch per step type, so that each literal narrows to its own member of `Step`.
			const step = (
				step:
					| Pick<SwapStep, 'type' | 'tool'>
					| Pick<CrossStep, 'type' | 'tool'>
					| Pick<ProtocolStep, 'type' | 'tool'>
			): Step =>
				step.type === 'swap'
					? { ...mockLifiQuote, ...step }
					: step.type === 'cross'
						? { ...mockLifiQuote, ...step }
						: { ...mockLifiQuote, ...step };

			const feeCollection = step({ type: 'protocol', tool: 'feeCollection' });
			const dexSwap = step({ type: 'swap', tool: 'nordstern' });
			const across = step({ type: 'cross', tool: 'across' });
			const near = step({ type: 'cross', tool: 'near' });

			// The ETH → Arbitrum USDC quote, through `includedSteps`.
			const routeVia = (includedSteps: Step[]): LiFiStep => ({
				...mockLifiQuote,
				action: {
					...mockLifiQuote.action,
					toChainId: ChainId.ARB,
					toToken: { ...mockLifiQuote.action.toToken, chainId: ChainId.ARB, address: arbitrumUsdc }
				},
				includedSteps
			});

			const bridgesOfCall = (call: number) =>
				vi.mocked(fetchLifiQuote).mock.calls[call]?.[0].allowBridges;

			it('should offer Across bridging directly, with the request it answers', async () => {
				const quote = routeVia([feeCollection, across]);

				vi.mocked(fetchLifiQuote).mockResolvedValue(quote);

				const offer = await fetchLifiSwapQuote(crossChainParams);

				expect(offer?.swapDetails).toStrictEqual(quote);
				expect(offer?.provider === SwapProvider.LIFI && offer.request.allowBridges).toEqual([
					'across',
					'near'
				]);
				expect(fetchLifiQuote).toHaveBeenCalledOnce();
			});

			it.each([
				{ route: 'behind a DEX swap', steps: [feeCollection, dexSwap, across] },
				{ route: 'followed by another step', steps: [feeCollection, across, dexSwap] }
			])(
				'should re-quote without Across when its route goes $route, and offer that route',
				async ({ steps }) => {
					const fallback = routeVia([feeCollection, dexSwap, near]);

					vi.mocked(fetchLifiQuote)
						.mockResolvedValueOnce(routeVia(steps))
						.mockResolvedValueOnce(fallback);

					const offer = await fetchLifiSwapQuote(crossChainParams);

					expect(offer?.swapDetails).toStrictEqual(fallback);
					// The request execution re-quotes with.
					expect(offer?.provider === SwapProvider.LIFI && offer.request.allowBridges).toEqual([
						'near'
					]);
					expect(fetchLifiQuote).toHaveBeenCalledTimes(2);
					expect(bridgesOfCall(1)).toEqual(['near']);
				}
			);

			it('should offer nothing when the route without Across cannot be executed either', async () => {
				vi.mocked(fetchLifiQuote)
					.mockResolvedValueOnce(routeVia([feeCollection, dexSwap, across]))
					.mockResolvedValueOnce(routeVia([feeCollection, near, dexSwap]));

				await expect(fetchLifiSwapQuote(crossChainParams)).resolves.toBeUndefined();

				expect(trackEvent).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						metadata: expect.objectContaining({
							result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
							result_error_type: PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES.NO_ROUTE
						})
					})
				);
			});

			it('should re-quote without NEAR Intents when its route is followed by another step', async () => {
				const fallback = routeVia([feeCollection, across]);

				vi.mocked(fetchLifiQuote)
					.mockResolvedValueOnce(routeVia([feeCollection, near, dexSwap]))
					.mockResolvedValueOnce(fallback);

				const offer = await fetchLifiSwapQuote(crossChainParams);

				expect(offer?.swapDetails).toStrictEqual(fallback);
				expect(offer?.provider === SwapProvider.LIFI && offer.request.allowBridges).toEqual([
					'across'
				]);
				expect(bridgesOfCall(1)).toEqual(['across']);
			});

			// Asking without it would ask the same again.
			it('should not re-quote a route through a bridge the request did not allow', async () => {
				vi.mocked(fetchLifiQuote).mockResolvedValue(
					routeVia([feeCollection, step({ type: 'cross', tool: 'relay' })])
				);

				await expect(fetchLifiSwapQuote(crossChainParams)).resolves.toBeUndefined();

				expect(fetchLifiQuote).toHaveBeenCalledOnce();
			});

			// The form waits for every provider: the re-quote gets what is left of the first deadline.
			it('should give both requests one deadline', async () => {
				const timeout = vi.spyOn(AbortSignal, 'timeout');

				vi.mocked(fetchLifiQuote)
					.mockResolvedValueOnce(routeVia([feeCollection, dexSwap, across]))
					.mockResolvedValueOnce(routeVia([feeCollection, dexSwap, near]));

				await fetchLifiSwapQuote(crossChainParams);

				const [[first], [second]] = vi.mocked(fetchLifiQuote).mock.calls;

				expect(second?.signal).toBe(first?.signal);
				expect(timeout).toHaveBeenCalledExactlyOnceWith(LIFI_QUOTE_TIMEOUT_MS);
			});
		});

		describe('a route through an in-between token', () => {
			const listedTokens = tokens as Writable<Token[]>;

			const baseUsdc = { chainId: ChainId.BAS, address: mockLifiBaseUsdcAddress };
			const robinhoodUsdg = { chainId: ChainId.OUT, address: USDG_TOKEN.address };
			const robinhoodNvda = { chainId: ChainId.OUT, address: NVDA_TOKEN.address };

			const pairParams = {
				...params,
				sourceToken: mockLifiBaseUsdcToken,
				destinationToken: NVDA_TOKEN
			};

			const action = ({ from, to }: { from: LifiTokenRef; to: LifiTokenRef }) => ({
				...mockLifiQuote.action,
				fromChainId: from.chainId,
				toChainId: to.chainId,
				fromToken: { ...mockLifiQuote.action.fromToken, ...from },
				toToken: { ...mockLifiQuote.action.toToken, ...to }
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
			) & { from: LifiTokenRef; to: LifiTokenRef }): Step =>
				type === 'swap'
					? { ...mockLifiQuote, type, tool, action: action({ from, to }) }
					: type === 'cross'
						? { ...mockLifiQuote, type, tool, action: action({ from, to }) }
						: { ...mockLifiQuote, type, tool, action: action({ from, to }) };

			// USDC (Base) → NVDA (Robinhood Chain), as LI.FI routed it on 2026-10-26: Across to USDG,
			// then a swap from an address LI.FI generates, which OISY cannot verify.
			const swapAfterBridge: LiFiStep = {
				...mockLifiQuote,
				action: action({ from: baseUsdc, to: robinhoodNvda }),
				includedSteps: [
					step({ type: 'protocol', tool: 'feeCollection', from: baseUsdc, to: baseUsdc }),
					step({ type: 'cross', tool: 'across', from: baseUsdc, to: robinhoodUsdg }),
					step({ type: 'swap', tool: 'smartDeposits', from: robinhoodUsdg, to: robinhoodNvda })
				],
				// An ERC-20 source travels through the allowance, not as the transaction's value.
				transactionRequest: { ...mockLifiQuote.transactionRequest, value: '0x0' }
			};

			// Not enabled: the hint names it all the same.
			const listedUsdg = { ...USDG_TOKEN, enabled: false };

			const viaUsdg = new SwapViaIntermediateTokenError({
				intermediateToken: listedUsdg,
				provider: SwapProvider.LIFI
			});

			beforeEach(() => {
				listedTokens.set([mockLifiBaseUsdcToken, listedUsdg, NVDA_TOKEN]);
			});

			it('should name the listed in-between token of a route OISY refused, without asking again', async () => {
				vi.mocked(fetchLifiQuote)
					.mockResolvedValueOnce(swapAfterBridge)
					// The re-quote without Across.
					.mockRejectedValueOnce(httpFailure(404));

				await expect(fetchLifiSwapQuote(pairParams)).rejects.toStrictEqual(viaUsdg);

				expect(fetchLifiQuote).toHaveBeenCalledTimes(2);
			});

			it('should still report the failed re-quote without Across', async () => {
				vi.mocked(fetchLifiQuote)
					.mockResolvedValueOnce(swapAfterBridge)
					.mockRejectedValueOnce(httpFailure(429));

				await expect(fetchLifiSwapQuote(pairParams)).rejects.toThrow(SwapViaIntermediateTokenError);

				expect(trackEvent).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						metadata: expect.objectContaining({
							result_error_type: PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES.RATE_LIMITED,
							result_error_code: '429'
						})
					})
				);
			});

			it('should ask once more, with steps after the bridge allowed, when LI.FI has no route', async () => {
				vi.mocked(fetchLifiQuote)
					.mockRejectedValueOnce(httpFailure(422))
					.mockResolvedValueOnce(swapAfterBridge);

				await expect(fetchLifiSwapQuote(pairParams)).rejects.toStrictEqual(viaUsdg);

				const [[first], [second]] = vi.mocked(fetchLifiQuote).mock.calls;

				expect(first?.allowDestinationCall).toBeFalsy();
				expect(second).toStrictEqual({ ...first, allowDestinationCall: true });
			});

			it('should not ask again after a failure other than a missing route', async () => {
				vi.mocked(fetchLifiQuote).mockRejectedValue(httpFailure(429));

				await expect(fetchLifiSwapQuote(pairParams)).resolves.toBeUndefined();

				expect(fetchLifiQuote).toHaveBeenCalledOnce();
			});

			it('should name no token from a quote that fails the trust checks', async () => {
				vi.mocked(fetchLifiQuote)
					.mockRejectedValueOnce(httpFailure(404))
					.mockResolvedValueOnce({
						...swapAfterBridge,
						transactionRequest: { ...swapAfterBridge.transactionRequest, to: mockLifiUserAddress }
					});

				await expect(fetchLifiSwapQuote(pairParams)).resolves.toBeUndefined();
			});

			// LI.FI's answers vary: the second request can come back with a route OISY can take, here
			// NEAR behind a DEX swap, for DAI (Base) → USDC (Arbitrum).
			it('should name no token from a route OISY could take after all', async () => {
				const baseDai = {
					chainId: ChainId.BAS,
					address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
				};
				const arbitrumUsdc = {
					chainId: ChainId.ARB,
					address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
				};

				vi.mocked(fetchLifiQuote)
					.mockRejectedValueOnce(httpFailure(422))
					.mockResolvedValueOnce({
						...swapAfterBridge,
						action: action({ from: baseDai, to: arbitrumUsdc }),
						includedSteps: [
							step({ type: 'protocol', tool: 'feeCollection', from: baseDai, to: baseDai }),
							step({ type: 'swap', tool: 'nordstern', from: baseDai, to: baseUsdc }),
							step({ type: 'cross', tool: 'near', from: baseUsdc, to: arbitrumUsdc })
						]
					});

				await expect(
					fetchLifiSwapQuote({
						...params,
						sourceToken: {
							...mockLifiBaseUsdcToken,
							id: parseTokenId('LifiBaseDai'),
							symbol: 'DAI',
							address: baseDai.address
						},
						destinationToken: {
							...mockLifiBaseUsdcToken,
							id: parseTokenId('LifiArbitrumUsdc'),
							network: ARBITRUM_MAINNET_NETWORK,
							address: arbitrumUsdc.address
						}
					})
				).resolves.toBeUndefined();

				expect(fetchLifiQuote).toHaveBeenCalledTimes(2);
			});

			it('should name no in-between token that OISY does not list', async () => {
				listedTokens.set([mockLifiBaseUsdcToken, NVDA_TOKEN]);

				vi.mocked(fetchLifiQuote)
					.mockResolvedValueOnce(swapAfterBridge)
					.mockRejectedValueOnce(httpFailure(404));

				await expect(fetchLifiSwapQuote(pairParams)).resolves.toBeUndefined();
			});

			it('should cache the in-between token with the answer', async () => {
				vi.mocked(fetchLifiQuote)
					.mockRejectedValueOnce(httpFailure(404))
					.mockResolvedValueOnce(swapAfterBridge);

				await expect(fetchLifiSwapQuote(pairParams)).rejects.toStrictEqual(viaUsdg);
				await expect(fetchLifiSwapQuote(pairParams)).rejects.toStrictEqual(viaUsdg);

				expect(fetchLifiQuote).toHaveBeenCalledTimes(2);
			});

			it('should ask within the deadline of the first request', async () => {
				vi.mocked(fetchLifiQuote)
					.mockRejectedValueOnce(httpFailure(404))
					.mockResolvedValueOnce(swapAfterBridge);

				await expect(fetchLifiSwapQuote(pairParams)).rejects.toThrow(SwapViaIntermediateTokenError);

				const [[first], [second]] = vi.mocked(fetchLifiQuote).mock.calls;

				expect(second?.signal).toBe(first?.signal);
			});
		});

		describe('cadence', () => {
			it('should answer unchanged inputs from the cache', async () => {
				const first = await fetchLifiSwapQuote(params);

				vi.setSystemTime(now + LIFI_QUOTE_REFRESH_INTERVAL_MS - 1);

				const second = await fetchLifiSwapQuote(params);

				expect(second).toBe(first);
				expect(fetchLifiQuote).toHaveBeenCalledOnce();
			});

			it('should re-quote unchanged inputs once the interval has passed', async () => {
				await fetchLifiSwapQuote(params);

				vi.setSystemTime(now + LIFI_QUOTE_REFRESH_INTERVAL_MS);

				await fetchLifiSwapQuote(params);

				expect(fetchLifiQuote).toHaveBeenCalledTimes(2);
			});

			it('should re-quote immediately when an input changes', async () => {
				await fetchLifiSwapQuote(params);
				await fetchLifiSwapQuote({ ...params, amount: mockLifiFromAmount * 2n });
				await fetchLifiSwapQuote({ ...params, slippage: 0.5 });

				expect(fetchLifiQuote).toHaveBeenCalledTimes(3);
			});

			it('should share a request still in flight', async () => {
				const [first, second] = await Promise.all([
					fetchLifiSwapQuote(params),
					fetchLifiSwapQuote(params)
				]);

				expect(second).toBe(first);
				expect(fetchLifiQuote).toHaveBeenCalledOnce();
			});

			describe('with a slow answer', () => {
				let answer: (quote: typeof mockLifiQuote) => void = () => undefined;

				beforeEach(() => {
					vi.mocked(fetchLifiQuote).mockReturnValueOnce(
						new Promise((resolve) => {
							answer = resolve;
						})
					);
				});

				it('should share a request still in flight past the interval', async () => {
					const first = fetchLifiSwapQuote(params);

					vi.setSystemTime(now + LIFI_QUOTE_REFRESH_INTERVAL_MS + 1);

					const second = fetchLifiSwapQuote(params);

					answer(mockLifiQuote);

					await expect(second).resolves.toBe(await first);
					expect(fetchLifiQuote).toHaveBeenCalledOnce();
				});

				it('should count the interval from the answer, not from the request', async () => {
					const answeredAt = now + 20_000;

					const first = fetchLifiSwapQuote(params);

					vi.setSystemTime(answeredAt);
					answer(mockLifiQuote);
					await first;

					vi.setSystemTime(answeredAt + LIFI_QUOTE_REFRESH_INTERVAL_MS - 1);
					await fetchLifiSwapQuote(params);

					expect(fetchLifiQuote).toHaveBeenCalledOnce();

					vi.setSystemTime(answeredAt + LIFI_QUOTE_REFRESH_INTERVAL_MS);
					await fetchLifiSwapQuote(params);

					expect(fetchLifiQuote).toHaveBeenCalledTimes(2);
				});
			});

			it('should give the SDK its own copy of the request', async () => {
				// The SDK writes its defaults into the object it is given. Were that object the
				// service's own, the quote would then be checked against the altered request.
				vi.mocked(fetchLifiQuote).mockImplementation((request: QuoteRequestFromAmount) => {
					request.integrator = 'filled-in-by-the-sdk';
					request.fromAmount = '1';

					return Promise.resolve(mockLifiQuote);
				});

				await expect(fetchLifiSwapQuote(params)).resolves.toMatchObject({
					provider: SwapProvider.LIFI
				});

				await fetchLifiSwapQuote(params);

				expect(fetchLifiQuote).toHaveBeenCalledOnce();
			});

			it('should cache a failure like any other outcome', async () => {
				vi.mocked(fetchLifiQuote).mockRejectedValue(httpFailure(404));

				await expect(fetchLifiSwapQuote(params)).resolves.toBeUndefined();
				await expect(fetchLifiSwapQuote(params)).resolves.toBeUndefined();

				expect(fetchLifiQuote).toHaveBeenCalledOnce();
			});
		});

		describe('analytics', () => {
			const baseMetadata = {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.TOKENS,
				event_subcontext: SwapProvider.LIFI,
				token_symbol: BASE_ETH_TOKEN.symbol,
				token_network: BASE_ETH_TOKEN.network.name,
				token_name: BASE_ETH_TOKEN.name,
				token_standard: BASE_ETH_TOKEN.standard.code,
				token_id: String(BASE_ETH_TOKEN.id),
				token2_symbol: mockLifiBaseUsdcToken.symbol,
				token2_network: mockLifiBaseUsdcToken.network.name,
				token2_name: mockLifiBaseUsdcToken.name,
				token2_standard: mockLifiBaseUsdcToken.standard.code,
				token2_id: String(mockLifiBaseUsdcToken.id)
			};

			it('should track an offer', async () => {
				await fetchLifiSwapQuote(params);

				expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
					name: PLAUSIBLE_EVENTS.SWAP_OFFER,
					metadata: { ...baseMetadata, result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS }
				});
			});

			it('should not track a cached answer again', async () => {
				await fetchLifiSwapQuote(params);
				await fetchLifiSwapQuote(params);

				expect(trackEvent).toHaveBeenCalledOnce();
			});

			it.each([
				{ status: 404, type: PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES.NO_ROUTE },
				{ status: 422, type: PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES.NO_ROUTE },
				{
					status: 429,
					type: PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES.RATE_LIMITED,
					severity: PLAUSIBLE_EVENT_SEVERITIES.WARN
				},
				{
					status: 500,
					type: PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES.REQUEST_FAILED,
					severity: PLAUSIBLE_EVENT_SEVERITIES.WARN
				}
			])('should report an HTTP $status as $type', async ({ status, type, severity }) => {
				vi.mocked(fetchLifiQuote).mockRejectedValue(httpFailure(status));

				await expect(fetchLifiSwapQuote(params)).resolves.toBeUndefined();

				expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
					name: PLAUSIBLE_EVENTS.SWAP_OFFER,
					metadata: {
						...baseMetadata,
						result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
						result_error_type: type,
						result_error_code: String(status),
						...(nonNullish(severity) && { event_severity: severity })
					}
				});
			});

			it('should report any other failure without its text', async () => {
				vi.mocked(fetchLifiQuote).mockRejectedValue(new Error(`failed for ${mockLifiUserAddress}`));

				await expect(fetchLifiSwapQuote(params)).resolves.toBeUndefined();

				expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
					name: PLAUSIBLE_EVENTS.SWAP_OFFER,
					metadata: {
						...baseMetadata,
						result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
						result_error_type: PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES.REQUEST_FAILED,
						event_severity: PLAUSIBLE_EVENT_SEVERITIES.WARN
					}
				});
			});

			it('should report a request aborted by the timeout', async () => {
				// The SDK wraps the abort of `AbortSignal.timeout` as it does any error.
				vi.mocked(fetchLifiQuote).mockRejectedValue(
					Object.assign(httpFailure(500), {
						cause: new DOMException('signal timed out', 'TimeoutError')
					})
				);

				await expect(fetchLifiSwapQuote(params)).resolves.toBeUndefined();

				expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
					name: PLAUSIBLE_EVENTS.SWAP_OFFER,
					metadata: {
						...baseMetadata,
						result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
						result_error_type: PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES.TIMEOUT,
						event_severity: PLAUSIBLE_EVENT_SEVERITIES.WARN
					}
				});
			});

			it('should refuse and report a quote that fails the trust checks', async () => {
				vi.mocked(fetchLifiQuote).mockResolvedValue({
					...mockLifiQuote,
					transactionRequest: { ...mockLifiQuote.transactionRequest, to: mockLifiUserAddress }
				});

				await expect(fetchLifiSwapQuote(params)).resolves.toBeUndefined();

				expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
					name: PLAUSIBLE_EVENTS.SWAP_OFFER,
					metadata: {
						...baseMetadata,
						result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
						result_error_type: PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES.QUOTE_REJECTED,
						event_severity: PLAUSIBLE_EVENT_SEVERITIES.ERROR
					}
				});
			});
		});
	});

	describe('without an integrator id', () => {
		beforeEach(() => {
			vi.resetModules();
		});

		afterEach(() => {
			vi.doUnmock('$env/rest/lifi.env');
			vi.resetModules();
		});

		it('should not request a quote', async () => {
			vi.doMock('$env/rest/lifi.env', async (importOriginal) => ({
				...(await importOriginal<typeof lifiEnv>()),
				LIFI_INTEGRATOR: ''
			}));

			const { fetchLifiSwapQuote: fetchQuote } = await import('$lib/services/lifi-swap.services');
			const { fetchLifiQuote: fetchQuoteRest } = await import('$lib/rest/lifi.rest');

			await expect(fetchQuote(params)).resolves.toBeUndefined();

			expect(fetchQuoteRest).not.toHaveBeenCalled();
		});
	});
});
