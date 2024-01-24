import type { EstimateWithdrawalFee } from '@dfinity/ckbtc';
import type { Readable } from 'svelte/store';
import { writable } from 'svelte/store';

export type BtcFeeStoreData = EstimateWithdrawalFee | undefined | null;

export interface BtcFeeStore extends Readable<BtcFeeStoreData> {
	setFee: (data: BtcFeeStoreData) => void;
}

export const initBtcFeeStore = (): BtcFeeStore => {
	const { subscribe, set } = writable<BtcFeeStoreData>(undefined);

	return {
		subscribe,

		setFee(data: BtcFeeStoreData) {
			set(data);
		}
	};
};

export interface BtcFeeContext {
	store: BtcFeeStore;
}

export const BTC_FEE_CONTEXT_KEY = Symbol('btc-fee');
