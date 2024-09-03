import { initCertifiedSetterStore } from '$lib/stores/certified-setter.store';
import type { StorageStoreData } from '$lib/stores/storage.store';
import type { Address, BtcAddress, EthAddress } from '$lib/types/address';
import type { CertifiedData } from '$lib/types/store';
import { writable, type Readable } from 'svelte/store';

export type AddressData<T extends Address = Address> = CertifiedData<T>;

export type OptionAddressData = StorageStoreData<AddressData>;

export const addressStore = initCertifiedSetterStore<AddressData>();

type OptionCertifiedAddressData<T extends Address> = AddressData<T> | undefined | null;

interface AddressStore<T extends Address> extends Readable<OptionCertifiedAddressData<T>> {
	set: (data: AddressData<T>) => void;
	reset: () => void;
}

const initAddressStore = <T extends Address>(): AddressStore<T> => {
	const { subscribe, set } = writable<OptionCertifiedAddressData<T>>(undefined);

	return {
		set: (data: AddressData<T>) => set(data),
		reset: () => set(null),
		subscribe
	};
};

export const btcAddressMainnetStore = initAddressStore<BtcAddress>();

export const ethAddressStore = initAddressStore<EthAddress>();
