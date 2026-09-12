import { writable, type Readable } from 'svelte/store';

/**
 * The fiat floor NEAR Intents imposes on the currently selected token pair, in USD.
 *
 * `undefined` means the pair has no floor, is not routable through NEAR Intents, or has not
 * been probed yet — the three are deliberately indistinguishable, because all three show the
 * user the same thing: nothing.
 */
export interface NearIntentsSwapLimitStore extends Readable<number | undefined> {
	set: (limit: number | undefined) => void;
	reset: () => void;
}

export const initNearIntentsSwapLimitStore = (): NearIntentsSwapLimitStore => {
	const { subscribe, set } = writable<number | undefined>(undefined);

	return {
		subscribe,
		set: (limit: number | undefined) => set(limit),
		reset: () => set(undefined)
	};
};

export const nearIntentsSwapLimitStore = initNearIntentsSwapLimitStore();
