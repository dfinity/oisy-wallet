import type { StakePositionResponse } from '$declarations/gldt_stake/declarations/gldt_stake.did';
import type { Option } from '$lib/types/utils';
import { writable, type Readable } from 'svelte/store';

export type GldtStakeStoreData = Option<{
	apy?: number;
	position?: StakePositionResponse;
}>;

export interface GldtStakeStore extends Readable<GldtStakeStoreData> {
	setApy: (value?: number) => void;
	resetApy: () => void;
	setPosition: (value?: StakePositionResponse) => void;
	resetPosition: () => void;
	reset: () => void;
}

export const initGldtStakeStore = (): GldtStakeStore => {
	const { subscribe, set, update } = writable<GldtStakeStoreData>(undefined);

	const setApy = (value?: number) => {
		update((state) => ({ ...state, apy: value }));
	};
	const setPosition = (value?: StakePositionResponse) => {
		update((state) => ({ ...state, position: value }));
	};

	return {
		subscribe,

		reset: () => set(undefined),

		setApy,

		resetApy: () => setApy(undefined),

		setPosition,

		resetPosition: () => setPosition(undefined)
	};
};

export interface GldtStakeContext {
	store: GldtStakeStore;
}

export const GLDT_STAKE_CONTEXT_KEY = Symbol('gldt-stake');
