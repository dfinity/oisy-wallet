import type { UtxosFee } from '$btc/types/btc-send';
import type { OptionAmount } from '$lib/types/send';
import type { Nullish } from '@dfinity/zod-schemas';
import { type Readable, writable } from 'svelte/store';

export type UtxosFeeStoreData = Nullish<{ utxosFee?: UtxosFee; amountForFee?: OptionAmount }>;

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
