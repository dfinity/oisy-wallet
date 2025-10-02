import type { Option } from '$lib/types/utils';
import { writable, type Readable } from 'svelte/store';

export type EthereumFeeStoreData = Option<{
	maxTransactionFee?: bigint;
}>;

export interface EthereumFeeStore extends Readable<EthereumFeeStoreData> {
	setFee: (data: EthereumFeeStoreData) => void;
}

export const initEthereumFeeStore = (): EthereumFeeStore => {
	const { subscribe, set } = writable<EthereumFeeStoreData>(undefined);

	return {
		subscribe,

		setFee: (data: EthereumFeeStoreData) => {
			set(data);
		}
	};
};

export interface EthereumFeeContext {
	store: EthereumFeeStore;
}

export const ETHEREUM_FEE_CONTEXT_KEY = Symbol('ethereum-fee');
