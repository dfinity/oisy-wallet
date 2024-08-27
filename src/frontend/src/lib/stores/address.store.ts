import { initCertifiedSetterStore } from '$lib/stores/certified-setter.store';
import type { StorageStoreData } from '$lib/stores/storage.store';
import type { Address } from '$lib/types/address';
import type { CertifiedData } from '$lib/types/store';

export type AddressData = CertifiedData<Address>;

export type OptionAddressData = StorageStoreData<AddressData>;

export const addressStore = initCertifiedSetterStore<AddressData>();
