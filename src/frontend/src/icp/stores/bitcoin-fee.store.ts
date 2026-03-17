import type { Nullish } from '@dfinity/zod-schemas';
import type { EstimateWithdrawalFee } from '@icp-sdk/canisters/ckbtc';
import { writable, type Readable } from 'svelte/store';

export type BitcoinFeeStoreData = Nullish<{
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
