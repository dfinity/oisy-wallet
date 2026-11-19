import type { UtxosFee } from '$btc/types/btc-send';
import type { OptionAmount } from '$lib/types/send';
import type { OptionString } from '$lib/types/string';
import type { Nullish } from '@dfinity/zod-schemas';
import { writable, type Readable } from 'svelte/store';

export type UtxosFeeStoreData = Nullish<{
	utxosFee?: UtxosFee;
	// We need to save the inputted amount for which UTXOs have been already fetched.
	// It allows us to compare it with the new value to prevent a re-fetch on consumer component re-render.
	amountForFee?: OptionAmount;
	// The recipient the fee was priced for: its output's size is part of the fee.
	destinationForFee?: OptionString;
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
