import type { IcToken } from '$icp/types/ic';
import type { Readable, Writable } from 'svelte/store';
import { writable } from 'svelte/store';

export type EthereumFeeStoreData =
	| {
			maxTransactionFee?: bigint | undefined;
	  }
	| undefined
	| null;

export interface EthereumFeeStore extends Readable<EthereumFeeStoreData> {
	setFee: (data: EthereumFeeStoreData) => void;
}

export const initEthereumFeeStore = (): EthereumFeeStore => {
	const { subscribe, set } = writable<EthereumFeeStoreData>(undefined);

	return {
		subscribe,

		setFee(data: EthereumFeeStoreData) {
			set(data);
		}
	};
};

export interface EthereumFeeContext {
	store: EthereumFeeStore;
	tokenCkEthStore: Writable<IcToken | undefined>;
}

export const ETHEREUM_FEE_CONTEXT_KEY = Symbol('ethereum-fee');
