import type { ETH_ADDRESS } from '$lib/types/address';
import { nonNullish } from '@dfinity/utils';
import { writable, type Readable } from 'svelte/store';

export type AbiData = Record<ETH_ADDRESS, string> | undefined | null;

export interface AbiStore extends Readable<AbiData> {
	set: (params: { address: ETH_ADDRESS; abi: string }) => void;
	reset: () => void;
}

const initAbiStore = (): AbiStore => {
	const { subscribe, update, set } = writable<AbiData>(undefined);

	return {
		set: ({ address, abi }) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[address]: abi
			})),
		reset: () => set(null),
		subscribe
	};
};

export const abiStore = initAbiStore();
