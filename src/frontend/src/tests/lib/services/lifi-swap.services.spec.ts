import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import type * as lifiEnv from '$env/rest/lifi.env';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import {
	LIFI_QUOTE_REFRESH_INTERVAL_MS,
	LIFI_QUOTE_TIMEOUT_MS
} from '$lib/constants/swap.constants';
import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENT_SEVERITIES,
	PLAUSIBLE_EVENT_SWAP_OFFER_ERROR_TYPES,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import { fetchLifiQuote } from '$lib/rest/lifi.rest';
import { trackEvent } from '$lib/services/analytics.services';
import { fetchLifiSwapQuote, resetLifiQuoteCache } from '$lib/services/lifi-swap.services';
import { SwapProvider } from '$lib/types/swap';
import { parseTokenId } from '$lib/validation/token.validation';
import {
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

vi.mock('$env/rest/lifi.env', async (importOriginal) => ({
	...(await importOriginal<typeof lifiEnv>()),
	LIFI_INTEGRATOR: 'oisy-test'
}));

vi.mock('$lib/rest/lifi.rest', () => ({
	fetchLifiQuote: vi.fn()
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
					destinationToken: mockValidSplToken,
					userAddress: mockSolAddress
				})
			).resolves.toBeUndefined();

			expect(fetchLifiQuote).not.toHaveBeenCalled();
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
