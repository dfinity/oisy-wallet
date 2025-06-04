import type { UtxosFee } from '$btc/types/btc-send';
import type { OptionAmount } from '$lib/types/send';
import type { Option } from '$lib/types/utils';
import { writable, type Readable } from 'svelte/store';

export type UtxosFeeStoreData = Option<{
	utxosFee?: UtxosFee;
	// We need to save the inputted amount for which UTXOs have been already fetched.
	// It allows us to compare it with the new value to prevent a re-fetch on consumer component re-render.
	amountForFee?: OptionAmount;
}>;

export interface UtxosFeeStore extends Readable<UtxosFeeStoreData> {
	setUtxosFee: (data: UtxosFeeStoreData) => void;
	reset: () => void;
}

export const initUtxosFeeStore = (): UtxosFeeStore => {
	const { subscribe, set } = writable<UtxosFeeStoreData>(undefined);

	return {
		subscribe,

		reset: () => {
			set(null);
		},

		setUtxosFee: (data: UtxosFeeStoreData) => {
			set(data);
		}
	};
};

export interface UtxosFeeContext {
	store: UtxosFeeStore;
}

export const UTXOS_FEE_CONTEXT_KEY = Symbol('utxos-fee');
