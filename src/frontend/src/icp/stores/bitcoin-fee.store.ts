import type { Option } from '$lib/types/utils';
import type { EstimateWithdrawalFee } from '@dfinity/ckbtc';
import { writable, type Readable } from 'svelte/store';

export type BitcoinFeeStoreData = Option<{
	bitcoinFee?: EstimateWithdrawalFee;
}>;

export interface BitcoinFeeStore extends Readable<BitcoinFeeStoreData> {
	setFee: (data: BitcoinFeeStoreData) => void;
}

export const initBitcoinFeeStore = (): BitcoinFeeStore => {
	const { subscribe, set } = writable<BitcoinFeeStoreData>(undefined);

	return {
		subscribe,

		setFee: (data: BitcoinFeeStoreData) => {
			set(data);
		}
	};
};

export interface BitcoinFeeContext {
	store: BitcoinFeeStore;
}

export const BITCOIN_FEE_CONTEXT_KEY = Symbol('bitcoin-fee');
