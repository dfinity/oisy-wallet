import type { BtcWithdrawalStatuses } from '$icp/types/btc';
import { initCertifiedSetterStore } from '$lib/stores/certified-setter.store';
import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';

export type BtcAddressData = CertifiedData<string>;
export const btcAddressStore = initCertifiedSetterStore<TokenId, BtcAddressData>();

export type BtcStatusesData = CertifiedData<BtcWithdrawalStatuses>;
export const btcStatusesStore = initCertifiedSetterStore<TokenId, BtcStatusesData>();
