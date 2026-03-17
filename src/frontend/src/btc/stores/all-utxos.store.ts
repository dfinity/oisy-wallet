import type { Nullish } from '@dfinity/zod-schemas';
import { type Readable, writable } from 'svelte/store';

export type AllUtxosStoreData = Nullish<{ allUtxos?: utxo[] }>;

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

export const allUtxosStore = initAllUtxosStore();
