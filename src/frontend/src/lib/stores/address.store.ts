import type { EthAddress } from '$lib/types/address';
import { writable, type Readable } from 'svelte/store';

export interface CertifiedAddressData {
	address: EthAddress;
	certified: boolean;
}

export type AddressData = CertifiedAddressData | undefined | null;

export interface AddressStore extends Readable<AddressData> {
	set: (data: CertifiedAddressData) => void;
	reset: () => void;
}

const initAddressStore = (): AddressStore => {
	const { subscribe, set } = writable<AddressData>(undefined);

	return {
		set: (data: CertifiedAddressData) => set(data),
		reset: () => set(null),
		subscribe
	};
};

export const addressStore = initAddressStore();
