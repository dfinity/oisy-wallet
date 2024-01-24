import { initCertifiedSetterStore } from '$lib/stores/certified-setter.store';
import type { CertifiedData } from '$lib/types/store';
import type { MinterInfo } from '@dfinity/ckbtc';

export type CkBtcMinterInfoData = CertifiedData<MinterInfo>;
export const ckBtcMinterInfoStore = initCertifiedSetterStore<CkBtcMinterInfoData>();

export type BtcAddressData = CertifiedData<string>;
export const btcAddressStore = initCertifiedSetterStore<BtcAddressData>();
