import { initCertifiedSetterStore } from '$lib/stores/certified-setter.store';
import type { CertifiedData } from '$lib/types/store';

export type BtcAddressData = CertifiedData<string>;
export const btcAddressStore = initCertifiedSetterStore<BtcAddressData>();
