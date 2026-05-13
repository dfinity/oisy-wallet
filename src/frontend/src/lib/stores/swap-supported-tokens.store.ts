import type { GetSupportedDestinationsFn, SwapProvider, SwapTokenCategory } from '$lib/types/swap';
import { writable, type Readable } from 'svelte/store';

export type SwapProviderListCoverage = 'all' | 'some' | 'none';

export interface SwapSupportedTokensInfo {
	coverage: SwapProviderListCoverage;
	supportedTokenIds: Set<string>;
}

export type SwapSupportedTokensData = Record<SwapTokenCategory, SwapSupportedTokensInfo>;

export interface SwapProviderSupport {
	key: SwapProvider;
	sourceCategory: SwapTokenCategory;
	// `undefined` when the provider does not expose `getSupportedTokens` (e.g. Velora).
	supportedSourceTokens: Set<string> | undefined;
	getSupportedDestinations: GetSupportedDestinationsFn;
}

export interface SwapSupportedState {
	aggregated: SwapSupportedTokensData;
	providers: SwapProviderSupport[];
}

export interface SwapSupportedTokensStore extends Readable<SwapSupportedState | undefined> {
	set: (state: SwapSupportedState) => void;
	reset: () => void;
}

const initSwapSupportedTokensStore = (): SwapSupportedTokensStore => {
	const { subscribe, set } = writable<SwapSupportedState | undefined>(undefined);

	return {
		subscribe,
		set,
		reset: () => set(undefined)
	};
};

export const swapSupportedTokensStore = initSwapSupportedTokensStore();
