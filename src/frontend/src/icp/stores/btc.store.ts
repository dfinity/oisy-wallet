import type { BtcWithdrawalStatuses } from '$icp/types/btc';
import { initCertifiedSetterStore } from '$lib/stores/certified-setter.store';
import type { CertifiedData } from '$lib/types/store';

export type BtcAddressData = CertifiedData<string>;
export const btcAddressStore = initCertifiedSetterStore<BtcAddressData>();

export type BtcStatusesData = CertifiedData<BtcWithdrawalStatuses>;
export const btcStatusesStore = initCertifiedSetterStore<BtcStatusesData>();
