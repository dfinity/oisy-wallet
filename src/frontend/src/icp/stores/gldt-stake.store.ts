import type { Option } from '$lib/types/utils';
import { writable, type Readable } from 'svelte/store';

export type GldtStakeStoreData = Option<{
	apy?: number;
}>;

export interface GldtStakeStore extends Readable<GldtStakeStoreData> {
	setApy: (value: number) => void;
	reset: () => void;
}

export const initGldtStakeStore = (): GldtStakeStore => {
	const { subscribe, set } = writable<GldtStakeStoreData>(undefined);

	return {
		subscribe,

		reset: () => set(undefined),

		setApy: (value: number) => {
			set({ apy: value });
		}
	};
};

export interface GldtStakeContext {
	store: GldtStakeStore;
}

export const GLDT_STAKE_CONTEXT_KEY = Symbol('gldt-stake');
