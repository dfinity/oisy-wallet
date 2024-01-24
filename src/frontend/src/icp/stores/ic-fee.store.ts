import type { EstimateWithdrawalFee } from '@dfinity/ckbtc';
import type { Readable } from 'svelte/store';
import { writable } from 'svelte/store';

export type IcFeeStoreData =
	| {
			bitcoinFee?: EstimateWithdrawalFee;
	  }
	| undefined
	| null;

export interface IcFeeStore extends Readable<IcFeeStoreData> {
	setFee: (data: IcFeeStoreData) => void;
}

export const initBitcoinFeeStore = (): IcFeeStore => {
	const { subscribe, set } = writable<IcFeeStoreData>(undefined);

	return {
		subscribe,

		setFee(data: IcFeeStoreData) {
			set(data);
		}
	};
};

export interface IcFeeContext {
	store: IcFeeStore;
}

export const IC_FEE_CONTEXT_KEY = Symbol('ic-fee');
