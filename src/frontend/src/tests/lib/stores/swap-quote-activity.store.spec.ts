import { initSwapQuoteActivityStore } from '$lib/stores/swap-quote-activity.store';
import { SwapProvider } from '$lib/types/swap';
import { get } from 'svelte/store';

describe('swap-quote-activity.store', () => {
	it('records a participating provider in the active quote round', () => {
		const activity = initSwapQuoteActivityStore();

		expect(get(activity)).toBeUndefined();

		activity.start({ requestId: 1, background: false });
		activity.addProvider({ requestId: 1, provider: SwapProvider.KONG_SWAP });

		expect(get(activity)).toEqual({
			requestId: 1,
			pending: true,
			background: false,
			providers: [SwapProvider.KONG_SWAP]
		});
	});

	it('deduplicates participation and ignores callbacks from a superseded round', () => {
		const activity = initSwapQuoteActivityStore();
		activity.start({ requestId: 1, background: false });
		activity.start({ requestId: 2, background: true });
		activity.addProvider({ requestId: 2, provider: SwapProvider.LIFI });
		activity.addProvider({ requestId: 2, provider: SwapProvider.LIFI });
		activity.addProvider({ requestId: 1, provider: SwapProvider.KONG_SWAP });
		activity.complete({ requestId: 1 });

		expect(get(activity)).toEqual({
			requestId: 2,
			pending: true,
			background: true,
			providers: [SwapProvider.LIFI]
		});
	});

	it('completes only the active round and rejects participation after completion or reset', () => {
		const activity = initSwapQuoteActivityStore();
		activity.start({ requestId: 1, background: false });
		activity.addProvider({ requestId: 1, provider: SwapProvider.KONG_SWAP });
		activity.complete({ requestId: 1 });
		activity.addProvider({ requestId: 1, provider: SwapProvider.LIFI });

		expect(get(activity)).toEqual({
			requestId: 1,
			pending: false,
			background: false,
			providers: [SwapProvider.KONG_SWAP]
		});

		activity.reset();
		activity.addProvider({ requestId: 1, provider: SwapProvider.LIFI });
		activity.complete({ requestId: 1 });

		expect(get(activity)).toBeUndefined();
	});

	it('does not publish stale or duplicate participation and completion callbacks', () => {
		const activity = initSwapQuoteActivityStore();
		const subscriber = vi.fn();
		const unsubscribe = activity.subscribe(subscriber);
		activity.start({ requestId: 2, background: false });
		activity.addProvider({ requestId: 2, provider: SwapProvider.LIFI });
		subscriber.mockClear();
		activity.addProvider({ requestId: 1, provider: SwapProvider.VELORA });
		activity.complete({ requestId: 1 });
		activity.addProvider({ requestId: 2, provider: SwapProvider.LIFI });

		expect(subscriber).not.toHaveBeenCalled();

		activity.complete({ requestId: 2 });
		subscriber.mockClear();
		activity.complete({ requestId: 2 });
		activity.addProvider({ requestId: 2, provider: SwapProvider.VELORA });

		expect(subscriber).not.toHaveBeenCalled();

		unsubscribe();
	});
});
