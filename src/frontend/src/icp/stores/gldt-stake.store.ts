import type { StakePositionResponse } from '$declarations/gldt_stake/declarations/gldt_stake.did';
import type { Option } from '$lib/types/utils';
import { writable, type Readable } from 'svelte/store';

export type GldtStakeStoreData = Option<{
	apy?: number;
	position?: StakePositionResponse;
}>;

export interface GldtStakeStore extends Readable<GldtStakeStoreData> {
	setApy: (value: number) => void;
	setPosition: (value?: StakePositionResponse) => void;
	reset: () => void;
}

export const initGldtStakeStore = (): GldtStakeStore => {
	const { subscribe, set, update } = writable<GldtStakeStoreData>(undefined);

	return {
		subscribe,

		reset: () => set(undefined),

		setApy: (value: number) => {
			update((state) => ({ ...state, apy: value }));
		},

		setPosition: (value?: StakePositionResponse) => {
			update((state) => ({ ...state, position: value }));
		}
	};
};

export interface GldtStakeContext {
	store: GldtStakeStore;
}

export const GLDT_STAKE_CONTEXT_KEY = Symbol('gldt-stake');
