import SwapAmountsContext from '$lib/components/swap/SwapAmountsContext.svelte';
import {
	SWAP_AMOUNTS_PERIODIC_FETCH_INTERVAL_MS,
	SWAP_PROVIDER_MIN_COMPARISON_MS
} from '$lib/constants/swap.constants';
import * as addressDerived from '$lib/derived/address.derived';
import * as authDerived from '$lib/derived/auth.derived';
import * as tokensDerived from '$lib/derived/tokens.derived';
import * as swapService from '$lib/services/swap.services';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import {
	initSwapQuoteActivityStore,
	type SwapQuoteActivity
} from '$lib/stores/swap-quote-activity.store';
import { SwapProvider, type FetchSwapAmountsParams, type SwapMappedResult } from '$lib/types/swap';
import { parseTokenId } from '$lib/validation/token.validation';
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
		{ destinationToken: { ...mockValidIcCkToken, id: parseTokenId('another destination') } }
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
