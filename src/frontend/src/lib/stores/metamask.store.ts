import { writable, type Readable } from 'svelte/store';

export interface MetamaskData {
	available: boolean | undefined | null;
}

export interface MetamaskStore extends Readable<MetamaskData> {
	set: (available: boolean) => void;
	reset: () => void;
}

const initMetamaskStore = (): MetamaskStore => {
	const INITIAL: MetamaskData = { available: undefined };
	const { subscribe, set } = writable<MetamaskData>(INITIAL);

	return {
		set: (available: boolean) => set({ available }),
		reset: () => set({ available: null }),
		subscribe
	};
};

export const metamaskStore = initMetamaskStore();
