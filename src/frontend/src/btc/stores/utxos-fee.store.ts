import type { UtxosFee } from '$btc/types/btc-send';
import type { Option } from '$lib/types/utils';
import { writable, type Readable } from 'svelte/store';

export type UtxosFeeStoreData = Option<{
	utxosFee?: UtxosFee;
}>;

export interface UtxosFeeStore extends Readable<UtxosFeeStoreData> {
	setUtxosFee: (data: UtxosFeeStoreData) => void;
	reset: () => void;
}

export const initUtxosFeeStore = (): UtxosFeeStore => {
	const { subscribe, set } = writable<UtxosFeeStoreData>(undefined);

	return {
		subscribe,

		reset() {
			set(null);
		},

		setUtxosFee(data: UtxosFeeStoreData) {
			set(data);
		}
	};
};

export interface UtxosFeeContext {
	store: UtxosFeeStore;
}

export const UTXOS_FEE_CONTEXT_KEY = Symbol('utxos-fee');
