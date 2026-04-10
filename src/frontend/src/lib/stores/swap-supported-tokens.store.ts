import { writable, type Readable } from 'svelte/store';

export type SwapProviderListCoverage = 'all' | 'some' | 'none';

export interface SwapSupportedTokensInfo {
	coverage: SwapProviderListCoverage;
	supportedTokenIds: Set<string>;
}

export type SwapSupportedTokensData = Record<string, SwapSupportedTokensInfo>;

export interface SwapSupportedTokensStore extends Readable<SwapSupportedTokensData | undefined> {
	set: (data: SwapSupportedTokensData) => void;
	reset: () => void;
}

const initSwapSupportedTokensStore = (): SwapSupportedTokensStore => {
	const { subscribe, set } = writable<SwapSupportedTokensData | undefined>(undefined);

	return {
		subscribe,
		set,
		reset: () => set(undefined)
	};
};

export const swapSupportedTokensStore = initSwapSupportedTokensStore();
