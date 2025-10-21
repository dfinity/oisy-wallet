import type { Option } from '$lib/types/utils';
import { writable, type Readable } from 'svelte/store';

export type GldtStakeApyStoreData = Option<{
	apy?: number;
}>;

export interface GldtStakeApyStore extends Readable<GldtStakeApyStoreData> {
	setApy: (value: number) => void;
	reset: () => void;
}

export const initGldtStakeApyStore = (): GldtStakeApyStore => {
	const { subscribe, set } = writable<GldtStakeApyStoreData>(undefined);

	return {
		subscribe,

		reset: () => set(undefined),

		setApy: (value: number) => {
			set({ apy: value });
		}
	};
};

export interface GldtStakeApyContext {
	store: GldtStakeApyStore;
}

export const GLDT_STAKE_APY_CONTEXT_KEY = Symbol('gldt-stake-apy');
