import type { SwapProvider } from '$lib/types/swap';
import { get, writable, type Readable } from 'svelte/store';

export interface SwapQuoteActivity {
	requestId: number;
	pending: boolean;
	background: boolean;
	providers: SwapProvider[];
}

export interface SwapQuoteActivityStore extends Readable<SwapQuoteActivity | undefined> {
	start: (params: { requestId: number; background: boolean }) => void;
	addProvider: (params: { requestId: number; provider: SwapProvider }) => void;
	complete: (params: { requestId: number }) => void;
	reset: () => void;
}

export const initSwapQuoteActivityStore = (): SwapQuoteActivityStore => {
	const store = writable<SwapQuoteActivity | undefined>(undefined);
	const { subscribe, set } = store;
	return {
		subscribe,
		start: ({ requestId, background }) => {
			set({ requestId, pending: true, background, providers: [] });
		},
		addProvider: ({ requestId, provider }) => {
			const activity = get(store);
			if (
				activity?.requestId !== requestId ||
				!activity.pending ||
				activity.providers.includes(provider)
			) {
				return;
			}
			set({ ...activity, providers: [...activity.providers, provider] });
		},
		complete: ({ requestId }) => {
			const activity = get(store);
			if (activity?.requestId !== requestId || !activity.pending) {
				return;
			}
			set({ ...activity, pending: false });
		},
		reset: () => set(undefined)
	};
};
