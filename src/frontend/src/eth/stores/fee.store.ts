import type { TransactionFeeData } from '$lib/types/transaction';
import type { Readable, Writable } from 'svelte/store';
import { writable } from 'svelte/store';

export type FeeStoreData = TransactionFeeData | undefined;

export interface FeeStore extends Readable<FeeStoreData> {
	setFee: (data: TransactionFeeData) => void;
}

export const initFeeStore = (): FeeStore => {
	const { subscribe, set } = writable<FeeStoreData>(undefined);

	return {
		subscribe,

		setFee(data: TransactionFeeData) {
			set(data);
		}
	};
};

export interface FeeContext {
	feeStore: FeeStore;
	feeSymbolStore: Writable<string | undefined>;
	evaluateFee?: () => void;
}

export const FEE_CONTEXT_KEY = Symbol('fee');
