import type { Address, BtcAddress, EthAddress } from '$lib/types/address';
import type { CertifiedData } from '$lib/types/store';
import { writable, type Readable } from 'svelte/store';

export type AddressData<T extends Address = Address> = CertifiedData<T>;

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
