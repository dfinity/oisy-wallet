import type { Nullish } from '@dfinity/zod-schemas';
import { type Readable, writable } from 'svelte/store';

interface MetamaskData {
	available: Nullish<boolean>;
}

interface MetamaskStore extends Readable<MetamaskData> {
	set: (available: boolean) => void;
	reset: () => void;
}

const initMetamaskStore = (): MetamaskStore => {
	const INITIAL: MetamaskData = { available: undefined };
	const { subscribe, set } = writable<MetamaskData>(INITIAL);

	return {
		set: (available: boolean) => set({ available }),
		reset: () => set(INITIAL),
		subscribe
	};
};

export const metamaskStore = initMetamaskStore();
