import type { Response, StakePositionResponse } from '$declarations/gldt_stake/gldt_stake.did';
import type { Option } from '$lib/types/utils';
import { writable, type Readable } from 'svelte/store';

export type GldtStakeStoreData = Option<{
	apy?: number;
	position?: StakePositionResponse;
	config?: Response;
}>;

export interface GldtStakeStore extends Readable<GldtStakeStoreData> {
	setApy: (value?: number) => void;
	resetApy: () => void;
	setConfig: (value?: Response) => void;
	resetConfig: () => void;
	setPosition: (value?: StakePositionResponse) => void;
	resetPosition: () => void;
	reset: () => void;
}

export const initGldtStakeStore = (): GldtStakeStore => {
	const { subscribe, set, update } = writable<GldtStakeStoreData>(undefined);

	const setApy = (value?: number) => {
		update((state) => ({ ...state, apy: value }));
	};
	const setConfig = (value?: Response) => {
		update((state) => ({ ...state, config: value }));
	};
	const setPosition = (value?: StakePositionResponse) => {
		update((state) => ({ ...state, position: value }));
	};

	return {
		subscribe,

		reset: () => set(undefined),

		setApy,

		resetApy: () => setApy(undefined),

		setConfig,

		resetConfig: () => setApy(undefined),

		setPosition,

		resetPosition: () => setPosition(undefined)
	};
};

export interface GldtStakeContext {
	store: GldtStakeStore;
}

export const GLDT_STAKE_CONTEXT_KEY = Symbol('gldt-stake');

export const gldtStakeStore = initGldtStakeStore();
