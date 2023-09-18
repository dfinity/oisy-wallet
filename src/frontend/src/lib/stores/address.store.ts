import type { ECDSA_PUBLIC_KEY } from '$lib/types/address';
import { writable, type Readable } from 'svelte/store';

export type AddressData = ECDSA_PUBLIC_KEY | undefined | null;

export interface AddressStore extends Readable<AddressData> {
	set: (address: ECDSA_PUBLIC_KEY) => void;
	reset: () => void;
}

const initAddressStore = (): AddressStore => {
	const { subscribe, set } = writable<AddressData>(undefined);

	return {
		set: (address: ECDSA_PUBLIC_KEY) => set(address),
		reset: () => set(undefined),
		subscribe
	};
};

export const addressStore = initAddressStore();
