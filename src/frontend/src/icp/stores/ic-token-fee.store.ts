import type { Option } from '$lib/types/utils';
import { writable, type Readable } from 'svelte/store';

export type IcTokenFeeStoreData = Option<Record<string, bigint>>;

export interface IcTokenFeeStore extends Readable<IcTokenFeeStoreData> {
	setIcTokenFee: (data: IcTokenFeeStoreData) => void;
	reset: () => void;
}

export const initIcTokenFeeStore = (): IcTokenFeeStore => {
	const { subscribe, set } = writable<IcTokenFeeStoreData>(undefined);

	return {
		subscribe,

		reset() {
			set(null);
		},

		setIcTokenFee(data: IcTokenFeeStoreData) {
			set(data);
		}
	};
};

export interface IcTokenFeeContext {
	store: IcTokenFeeStore;
}

export const IC_TOKEN_FEE_CONTEXT_KEY = Symbol('ic-token-fee');

// the store is global to cache already loaded token fees
export const icTokenFeeStore = initIcTokenFeeStore();
