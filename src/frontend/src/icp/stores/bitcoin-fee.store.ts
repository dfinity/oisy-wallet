import type { EstimateWithdrawalFee } from '@dfinity/ckbtc';
import type { Readable } from 'svelte/store';
import { writable } from 'svelte/store';

export type BitcoinFeeStoreData =
	| {
			bitcoinFee?: EstimateWithdrawalFee;
	  }
	| undefined
	| null;

export interface BitcoinFeeStore extends Readable<BitcoinFeeStoreData> {
	setFee: (data: BitcoinFeeStoreData) => void;
}

export const initBitcoinFeeStore = (): BitcoinFeeStore => {
	const { subscribe, set } = writable<BitcoinFeeStoreData>(undefined);

	return {
		subscribe,

		setFee(data: BitcoinFeeStoreData) {
			set(data);
		}
	};
};

export interface BitcoinFeeContext {
	store: BitcoinFeeStore;
}

export const BITCOIN_FEE_CONTEXT_KEY = Symbol('bitcoin-fee');
