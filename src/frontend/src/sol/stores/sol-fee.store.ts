import { writable, type Readable, type Writable } from 'svelte/store';

export type FeeStoreData = bigint | undefined;

export interface FeeStore extends Readable<FeeStoreData> {
	setFee: (data: bigint | undefined) => void;
}

export const initFeeStore = (): FeeStore => {
	const { subscribe, set } = writable<FeeStoreData>(undefined);

	return {
		subscribe,

		setFee(data: bigint | undefined) {
			set(data);
		}
	};
};

export interface FeeContext {
	feeStore: FeeStore;
	prioritizationFeeStore: FeeStore;
	feeSymbolStore: Writable<string | undefined>;
	feeDecimalsStore: Writable<number | undefined>;
}

export const initFeeContext = (params: FeeContext): FeeContext => params;

export const SOL_FEE_CONTEXT_KEY = Symbol('sol-fee');
