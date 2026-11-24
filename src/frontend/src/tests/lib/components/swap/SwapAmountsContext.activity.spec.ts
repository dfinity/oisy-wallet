import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import SwapAmountsContext from '$lib/components/swap/SwapAmountsContext.svelte';
import {
	SWAP_AMOUNTS_PERIODIC_FETCH_INTERVAL_MS,
	SWAP_PROVIDER_MIN_COMPARISON_MS
} from '$lib/constants/swap.constants';
import * as addressDerived from '$lib/derived/address.derived';
import * as authDerived from '$lib/derived/auth.derived';
import * as tokensDerived from '$lib/derived/tokens.derived';
import * as swapService from '$lib/services/swap.services';
import { balancesStore } from '$lib/stores/balances.store';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import {
	initSwapQuoteActivityStore,
	type SwapQuoteActivity
} from '$lib/stores/swap-quote-activity.store';
import { initSwapContext } from '$lib/stores/swap.store';
import { SwapProvider, type FetchSwapAmountsParams, type SwapMappedResult } from '$lib/types/swap';
import { parseTokenId } from '$lib/validation/token.validation';
import SwapAmountsContextTokensTest from '$tests/lib/components/swap/SwapAmountsContextTokensTest.svelte';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockSwapProviders } from '$tests/mocks/swap.mocks';
import { mockContextMap } from '$tests/utils/context.test-utils';
import { runResolvedPromises } from '$tests/utils/timers.test-utils';
import { act, render } from '@testing-library/svelte';
import { get, readable, writable } from 'svelte/store';

describe('SwapAmountsContext quote activity', () => {
	let store: ReturnType<typeof initSwapAmountsStore>;
	let activity: ReturnType<typeof initSwapQuoteActivityStore>;
	const props = {
		amount: '10',
		sourceToken: mockValidIcToken,
		destinationToken: mockValidIcCkToken,
		slippageValue: '0.3',
		isSwapAmountsLoading: false,
		isSourceTokenIcrc2: true
	};
	const mount = () =>
		act(() =>
			render(SwapAmountsContext, {
				props,
				context: mockContextMap([[SWAP_AMOUNTS_CONTEXT_KEY, { store, activity }]])
			})
		);
	const advance = async (ms = 300) => {
		await act(() => vi.advanceTimersByTimeAsync(ms));
		await runResolvedPromises();
	};

	beforeEach(() => {
		vi.useFakeTimers();
		store = initSwapAmountsStore();
		activity = initSwapQuoteActivityStore();
		vi.spyOn(authDerived, 'authIdentity', 'get').mockReturnValue(readable(mockIdentity));
		vi.spyOn(tokensDerived, 'tokens', 'get').mockReturnValue(
			readable([props.sourceToken, props.destinationToken])
		);
		vi.spyOn(addressDerived, 'ethAddress', 'get').mockReturnValue(readable('0x123'));
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('keeps accepted quotes quiet when unrelated balance updates re-emit the selected tokens', async () => {
		const fetchMock = vi
			.spyOn(swapService, 'fetchSwapAmounts')
			.mockResolvedValue(mockSwapProviders);
		const { sourceToken, destinationToken } = initSwapContext(props);
		const sourceEmissions = vi.fn();
		const destinationEmissions = vi.fn();
		const stopSource = sourceToken.subscribe(sourceEmissions);
		const stopDestination = destinationToken.subscribe(destinationEmissions);
		const { unmount } = await act(() =>
			render(SwapAmountsContextTokensTest, {
				props: { ...props, sourceToken, destinationToken },
				context: mockContextMap([[SWAP_AMOUNTS_CONTEXT_KEY, { store, activity }]])
			})
		);
		await advance();
		store.setManualProvider(mockSwapProviders[1]);
		const acceptedActivity = get(activity);
		const acceptedQuote = get(store);
		const activityEmissions = vi.fn();
		const stopActivity = activity.subscribe(activityEmissions);
		activityEmissions.mockClear();
		sourceEmissions.mockClear();
		destinationEmissions.mockClear();

		expect(fetchMock).toHaveBeenCalledOnce();
		expect(acceptedActivity?.pending).toBeFalsy();

		await act(() => {
			balancesStore.set({ id: ETHEREUM_TOKEN.id, data: { data: 1n, certified: false } });
		});
		await act(() => {
			balancesStore.set({ id: ETHEREUM_TOKEN.id, data: { data: 1n, certified: false } });
		});

		expect(sourceEmissions).toHaveBeenCalledTimes(2);
		expect(destinationEmissions).toHaveBeenCalledTimes(2);
		expect(sourceEmissions).toHaveBeenLastCalledWith(props.sourceToken);
		expect(destinationEmissions).toHaveBeenLastCalledWith(props.destinationToken);
		expect(get(activity)).toBe(acceptedActivity);
		expect(activityEmissions).not.toHaveBeenCalled();

		await advance();

		expect(fetchMock).toHaveBeenCalledOnce();
		expect(get(store)).toBe(acceptedQuote);

		await advance(SWAP_AMOUNTS_PERIODIC_FETCH_INTERVAL_MS);

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(get(activity)).toMatchObject({ requestId: 2, pending: false, background: true });
		expect(get(store)?.selectedProvider).toEqual(mockSwapProviders[1]);

		stopActivity();
		stopSource();
		stopDestination();
		unmount();
	});

	it.each(['debounce', 'pricing', 'hold', 'accepted', 'background'] as const)(
		'preserves the current %s round when token stores emit unchanged identities',
		async (phase) => {
			const sourceToken = writable(props.sourceToken);
			const destinationToken = writable(props.destinationToken);
			const rounds: {
				params: FetchSwapAmountsParams;
				resolve: (offers: SwapMappedResult[]) => void;
			}[] = [];
			const fetchMock = vi
				.spyOn(swapService, 'fetchSwapAmounts')
				.mockImplementation((params) => new Promise((resolve) => rounds.push({ params, resolve })));
			const { unmount } = await act(() =>
				render(SwapAmountsContextTokensTest, {
					props: { ...props, sourceToken, destinationToken },
					context: mockContextMap([[SWAP_AMOUNTS_CONTEXT_KEY, { store, activity }]])
				})
			);
			if (phase !== 'debounce') {
				await advance();
			}
			if (phase === 'hold') {
				await act(() => rounds[0].params.onProviderParticipating?.(SwapProvider.LIFI));
			}
			if (phase === 'hold' || phase === 'accepted' || phase === 'background') {
				await act(() => rounds[0].resolve(mockSwapProviders));
				await runResolvedPromises();
			}
			if (phase === 'background') {
				store.setManualProvider(mockSwapProviders[1]);
				await advance(SWAP_AMOUNTS_PERIODIC_FETCH_INTERVAL_MS);
			}
			const currentActivity = get(activity);
			const currentQuote = get(store);
			const activityEmissions = vi.fn();
			const stopActivity = activity.subscribe(activityEmissions);
			activityEmissions.mockClear();
			const callsBefore = fetchMock.mock.calls.length;

			for (const tokenStore of [sourceToken, destinationToken]) {
				await act(() => tokenStore.set(get(tokenStore)));
				await act(() => tokenStore.set({ ...get(tokenStore) }));

				expect(get(activity)).toBe(currentActivity);
				expect(activityEmissions).not.toHaveBeenCalled();
				expect(get(store)).toBe(currentQuote);
				expect(fetchMock).toHaveBeenCalledTimes(callsBefore);
			}

			await advance();

			expect(fetchMock).toHaveBeenCalledTimes(phase === 'background' ? 2 : 1);
			expect(get(activity)).toBe(currentActivity);

			if (phase === 'debounce') {
				expect(get(activity)).toMatchObject({ requestId: 1, pending: true, background: false });
			}
			if (phase === 'hold') {
				await advance(SWAP_PROVIDER_MIN_COMPARISON_MS);
			}
			if (phase === 'debounce' || phase === 'pricing' || phase === 'background') {
				await act(() => rounds.at(-1)?.resolve(mockSwapProviders));
				await runResolvedPromises();
			}

			expect(get(activity)?.pending).toBeFalsy();

			stopActivity();
			unmount();
		}
	);

	it.each(['sourceToken', 'destinationToken'] as const)(
		'invalidates pending pricing when the %s store selects a different TokenId with the same symbol',
		async (side) => {
			const sourceToken = writable(props.sourceToken);
			const destinationToken = writable(props.destinationToken);
			const rounds: {
				params: FetchSwapAmountsParams;
				resolve: (offers: SwapMappedResult[]) => void;
			}[] = [];
			vi.spyOn(swapService, 'fetchSwapAmounts').mockImplementation(
				(params) => new Promise((resolve) => rounds.push({ params, resolve }))
			);
			const { unmount } = await act(() =>
				render(SwapAmountsContextTokensTest, {
					props: { ...props, sourceToken, destinationToken },
					context: mockContextMap([[SWAP_AMOUNTS_CONTEXT_KEY, { store, activity }]])
				})
			);
			await advance();
			const tokenStore = side === 'sourceToken' ? sourceToken : destinationToken;
			const nextToken = { ...props[side], id: parseTokenId(props[side].symbol) };
			await act(() => tokenStore.set(nextToken));

			expect(get(activity)).toMatchObject({ requestId: 2, pending: true, background: false });

			await act(() => {
				rounds[0].params.onProviderParticipating?.(SwapProvider.LIFI);
				rounds[0].resolve(mockSwapProviders);
			});
			await runResolvedPromises();

			expect(get(activity)?.providers).toEqual([]);
			expect(get(store)).toBeUndefined();

			await advance();

			expect(rounds).toHaveLength(2);
			expect(rounds[1].params[side]).toBe(nextToken);

			await act(() => rounds[1].resolve(mockSwapProviders));
			await runResolvedPromises();

			expect(get(activity)).toMatchObject({ requestId: 2, pending: false, background: false });
			expect(get(store)?.selectedProvider).toEqual(mockSwapProviders[0]);

			unmount();
		}
	);

	it('starts and completes a foreground round even when pricing settles immediately', async () => {
		vi.spyOn(swapService, 'fetchSwapAmounts').mockResolvedValue(mockSwapProviders);
		const states: (SwapQuoteActivity | undefined)[] = [];
		const unsubscribe = activity.subscribe((value) => states.push(value));
		const { unmount } = await mount();
		await advance();

		expect(states).toContainEqual({
			requestId: 1,
			pending: true,
			background: false,
			providers: []
		});
		expect(get(activity)).toEqual({
			requestId: 1,
			pending: false,
			background: false,
			providers: []
		});
		expect(get(store)?.selectedProvider).toEqual(mockSwapProviders[0]);

		unsubscribe();
		unmount();
	});

	it('replaces invalidated activity immediately with the queued round and rejects every stale callback', async () => {
		const rounds: {
			params: FetchSwapAmountsParams;
			resolve: (offers: SwapMappedResult[]) => void;
		}[] = [];
		vi.spyOn(swapService, 'fetchSwapAmounts').mockImplementation(
			(params) => new Promise((resolve) => rounds.push({ params, resolve }))
		);
		const { rerender, unmount } = await mount();
		await advance();
		rounds[0].params.onProviderParticipating?.(SwapProvider.LIFI);

		expect(get(activity)?.providers).toEqual([SwapProvider.LIFI]);

		await rerender({ amount: '20' });

		const queued = { requestId: 2, pending: true, background: false, providers: [] };

		expect(get(activity)).toEqual(queued);

		rounds[0].params.onProviderParticipating?.(SwapProvider.VELORA);

		expect(get(activity)).toEqual(queued);

		await advance();

		expect(get(activity)?.requestId).toBe(2);

		rounds[1].params.onProviderParticipating?.(SwapProvider.KONG_SWAP);
		rounds[0].resolve(mockSwapProviders);
		await runResolvedPromises();

		expect(get(activity)).toEqual({
			requestId: 2,
			pending: true,
			background: false,
			providers: [SwapProvider.KONG_SWAP]
		});
		expect(get(store)).toBeUndefined();

		rounds[1].resolve([mockSwapProviders[1]]);
		await runResolvedPromises();
		// A one-provider round is held for the minimum comparison too.
		await advance(SWAP_PROVIDER_MIN_COMPARISON_MS);

		expect(get(activity)?.pending).toBeFalsy();
		expect(get(store)?.amountForSwap).toBe(20);

		unmount();
	});

	it.each(['pause', 'destroy'] as const)(
		'invalidates activity and pending work on %s',
		async (mode) => {
			let quoteParams: FetchSwapAmountsParams | undefined;
			let fail: (reason: Error) => void = () => {};
			const fetchMock = vi.spyOn(swapService, 'fetchSwapAmounts').mockImplementation((params) => {
				quoteParams = params;
				return new Promise((_, reject) => {
					fail = reject;
				});
			});
			const { rerender, unmount } = await mount();
			await advance();

			expect(get(activity)?.pending).toBeTruthy();

			if (mode === 'destroy') {
				unmount();
			} else {
				await rerender({ pauseAmountUpdates: true });
			}

			expect(get(activity)).toBeUndefined();

			quoteParams?.onProviderParticipating?.(SwapProvider.LIFI);
			fail(new Error('late failure'));
			await runResolvedPromises();

			expect(get(activity)).toBeUndefined();
			expect(get(store)).toBeNull();

			if (mode !== 'destroy') {
				await rerender({ amount: '20' });
			}
			await advance(SWAP_AMOUNTS_PERIODIC_FETCH_INTERVAL_MS * 2);

			expect(fetchMock).toHaveBeenCalledOnce();

			if (mode !== 'destroy') {
				unmount();
			}
		}
	);

	it('skips overlapping periodic work and marks a later refresh as background without clearing offers', async () => {
		const rounds: {
			params: FetchSwapAmountsParams;
			resolve: (offers: SwapMappedResult[]) => void;
		}[] = [];
		const fetchMock = vi
			.spyOn(swapService, 'fetchSwapAmounts')
			.mockImplementation((params) => new Promise((resolve) => rounds.push({ params, resolve })));
		const { unmount } = await mount();
		await advance();
		await advance(SWAP_AMOUNTS_PERIODIC_FETCH_INTERVAL_MS * 2);

		expect(fetchMock).toHaveBeenCalledOnce();

		rounds[0].resolve(mockSwapProviders);
		await runResolvedPromises();
		store.setManualProvider(mockSwapProviders[1]);
		await advance(SWAP_AMOUNTS_PERIODIC_FETCH_INTERVAL_MS);

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(get(activity)).toEqual({ requestId: 2, pending: true, background: true, providers: [] });
		expect(get(store)?.selectedProvider).toEqual(mockSwapProviders[1]);

		rounds[1].params.onProviderParticipating?.(SwapProvider.LIFI);
		rounds[0].params.onProviderParticipating?.(SwapProvider.VELORA);

		expect(get(activity)?.providers).toEqual([SwapProvider.LIFI]);

		rounds[1].resolve(mockSwapProviders);
		await runResolvedPromises();

		expect(get(activity)?.pending).toBeFalsy();
		expect(get(store)?.selectedProvider).toEqual(mockSwapProviders[1]);

		unmount();
	});

	it('still prices foreground inputs when periodic updates are disabled', async () => {
		const fetchMock = vi
			.spyOn(swapService, 'fetchSwapAmounts')
			.mockResolvedValue(mockSwapProviders);
		const { unmount } = await act(() =>
			render(SwapAmountsContext, {
				props: { ...props, enableAmountUpdates: false },
				context: mockContextMap([[SWAP_AMOUNTS_CONTEXT_KEY, { store, activity }]])
			})
		);
		await advance();

		expect(fetchMock).toHaveBeenCalledOnce();
		expect(get(activity)?.background).toBeFalsy();

		await advance(SWAP_AMOUNTS_PERIODIC_FETCH_INTERVAL_MS * 2);

		expect(fetchMock).toHaveBeenCalledOnce();

		unmount();
	});

	it.each([
		{ slippageValue: '0.5' },
		{ sourceToken: { ...mockValidIcToken, id: parseTokenId(mockValidIcToken.symbol) } },
		{ destinationToken: { ...mockValidIcCkToken, id: parseTokenId('another destination') } },
		{ isSourceTokenIcrc2: false }
	])('starts a fresh foreground round when another quote input changes: %o', async (change) => {
		const fetchMock = vi
			.spyOn(swapService, 'fetchSwapAmounts')
			.mockResolvedValue(mockSwapProviders);
		const { rerender, unmount } = await mount();
		await advance();
		await rerender(change);

		expect(get(activity)).toEqual({
			requestId: 2,
			pending: true,
			background: false,
			providers: []
		});

		await advance();

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(get(activity)).toEqual({
			requestId: 2,
			pending: false,
			background: false,
			providers: []
		});

		unmount();
	});

	it('invalidates pending pricing when the authenticated identity disappears', async () => {
		const identity = writable<typeof mockIdentity | undefined>(mockIdentity);
		vi.spyOn(authDerived, 'authIdentity', 'get').mockReturnValue(identity);
		let quoteParams: FetchSwapAmountsParams | undefined;
		let resolveQuote: (offers: SwapMappedResult[]) => void = () => {};
		vi.spyOn(swapService, 'fetchSwapAmounts').mockImplementation((params) => {
			quoteParams = params;
			return new Promise((resolve) => {
				resolveQuote = resolve;
			});
		});
		const { unmount } = await mount();
		await advance();
		await act(() => identity.set(undefined));

		expect(get(activity)).toBeUndefined();

		quoteParams?.onProviderParticipating?.(SwapProvider.LIFI);
		resolveQuote(mockSwapProviders);
		await runResolvedPromises();

		expect(get(activity)).toBeUndefined();
		expect(get(store)).toBeNull();

		unmount();
	});

	it('restarts the refresh clock with a fresh foreground quote, so a refresh never lands mid-reveal', async () => {
		const fetchMock = vi
			.spyOn(swapService, 'fetchSwapAmounts')
			.mockResolvedValue(mockSwapProviders);
		const { unmount } = await mount();
		// The foreground round queues at mount and prices after its 300 ms debounce.
		await advance();

		expect(fetchMock).toHaveBeenCalledOnce();

		// A clock started at mount would refresh at 5,000 ms; this one counts from the quote.
		await advance(SWAP_AMOUNTS_PERIODIC_FETCH_INTERVAL_MS - 200);

		expect(fetchMock).toHaveBeenCalledOnce();

		await advance(200);

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(get(activity)?.background).toBeTruthy();

		unmount();
	});
});
