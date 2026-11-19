import type { BtcAddress } from '$btc/types/address';
import type { EthAddress } from '$eth/types/address';
import type { Address } from '$lib/types/address';
import type { CertifiedData } from '$lib/types/store';
import type { SolAddress } from '$sol/types/address';
import type { XrpAddress } from '$xrp/types/address';
import type { Nullish } from '@dfinity/zod-schemas';
import { writable, type Readable } from 'svelte/store';

type CertifiedAddressData<T extends Address> = CertifiedData<T>;

export type AddressStoreData<T extends Address> = Nullish<CertifiedAddressData<T>>;

export interface AddressStore<T extends Address> extends Readable<AddressStoreData<T>> {
	set: (data: CertifiedAddressData<T>) => void;
	reset: () => void;
}

const initAddressStore = <T extends Address>(): AddressStore<T> => {
	const { subscribe, set } = writable<AddressStoreData<T>>(undefined);

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

export const xrpAddressMainnetStore = initAddressStore<XrpAddress>();
