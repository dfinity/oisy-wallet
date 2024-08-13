import { initCertifiedSetterStore } from '$lib/stores/certified-setter.store';
import type { EthAddress } from '$lib/types/address';
import type { CertifiedData } from '$lib/types/store';

export type AddressData = CertifiedData<EthAddress>;

export const addressStore = initCertifiedSetterStore<AddressData>();
