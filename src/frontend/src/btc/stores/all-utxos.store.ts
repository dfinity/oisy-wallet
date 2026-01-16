import type { Option } from '$lib/types/utils';
import type { BitcoinDid } from '@icp-sdk/canisters/ckbtc';
import { writable, type Readable } from 'svelte/store';

export type AllUtxosStoreData = Option<{
	allUtxos?: BitcoinDid.utxo[];
}>;

export interface AllUtxosStore extends Readable<AllUtxosStoreData> {
	setAllUtxos: (data: AllUtxosStoreData) => void;
	reset: () => void;
}

export const initAllUtxosStore = (): AllUtxosStore => {
	const { subscribe, set } = writable<AllUtxosStoreData>();

	return {
		subscribe,

		reset: () => {
			set(null);
		},

		setAllUtxos: (data: AllUtxosStoreData) => {
			set(data);
		}
	};
};

export interface AllUtxosContext {
	store: AllUtxosStore;
}

export const ALL_UTXOS_CONTEXT_KEY = Symbol('all-utxos');
