import type { StorageStoreData } from '$lib/stores/storage.store';
import type { Address, BtcAddress, EthAddress, SolAddress } from '$lib/types/address';
import type { CertifiedData } from '$lib/types/store';
import { writable, type Readable } from 'svelte/store';

type CertifiedAddressData<T extends Address> = CertifiedData<T>;

export type StorageAddressData<T extends Address> = StorageStoreData<CertifiedAddressData<T>>;

export interface AddressStore<T extends Address> extends Readable<StorageAddressData<T>> {
	set: (data: CertifiedAddressData<T>) => void;
	reset: () => void;
}

const initAddressStore = <T extends Address>(): AddressStore<T> => {
	const { subscribe, set } = writable<StorageAddressData<T>>(undefined);

	return {
		set: (data: CertifiedAddressData<T>) => set(data),
		reset: () => set(null),
		subscribe
	};
};

export const btcAddressRegtestStore = initAddressStore<BtcAddress>();
export const btcAddressTestnetStore = initAddressStore<BtcAddress>();
export const btcAddressMainnetStore = initAddressStore<BtcAddress>();

export const ethAddressStore = initAddressStore<EthAddress>();

export const solAddressMainnetStore = initAddressStore<SolAddress>();
export const solAddressDevnetStore = initAddressStore<SolAddress>();
export const solAddressLocalnetStore = initAddressStore<SolAddress>();
