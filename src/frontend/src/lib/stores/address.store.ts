import { initCertifiedSetterStore } from '$lib/stores/certified-setter.store';
import type { StorageStoreData } from '$lib/stores/storage.store';
import type { Address, BtcAddress, EthAddress } from '$lib/types/address';
import type { CertifiedData } from '$lib/types/store';
import { writable, type Readable } from 'svelte/store';

export type AddressData = CertifiedData<Address>;

export type OptionAddressData = StorageStoreData<AddressData>;

export const addressStore = initCertifiedSetterStore<AddressData>();

export type CertifiedAddressData<T extends Address> = {
	address: T;
	certified: boolean;
};

export type OptionCertifiedAddressData<T extends Address> =
	| CertifiedAddressData<T>
	| undefined
	| null;

export interface AddressStore<T extends Address> extends Readable<OptionCertifiedAddressData<T>> {
	set: (data: CertifiedAddressData<T>) => void;
	reset: () => void;
}

const initAddressStore = <T extends Address>(): AddressStore<T> => {
	const { subscribe, set } = writable<OptionCertifiedAddressData<T>>(undefined);

	return {
		set: (data: CertifiedAddressData<T>) => set(data),
		reset: () => set(null),
		subscribe
	};
};

export const btcAddressMainnetStore = initAddressStore<BtcAddress>();

export const ethAddressStore = initAddressStore<EthAddress>();
