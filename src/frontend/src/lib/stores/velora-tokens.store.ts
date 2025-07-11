import type { Option } from '$lib/types/utils';
import { writable, type Readable } from 'svelte/store';

export type VeloraTokensStoreData = Option<Record<string, any>>;

interface VeloraTokensStore extends Readable<VeloraTokensStoreData> {
	setVeloraTokens: (data: VeloraTokensStoreData) => void;
}

const initVeloraTokensStore = (): VeloraTokensStore => {
	const { subscribe, set } = writable<VeloraTokensStoreData>(undefined);

	return {
		subscribe,

		setVeloraTokens: (data: VeloraTokensStoreData) => {
			set(data);
		}
	};
};

// The store is global but will be filled with data only once user opens the Swap modal.
// It is done this way to make sure that we load static supported velora tokens data just once.
export const veloraTokensStore = initVeloraTokensStore();
