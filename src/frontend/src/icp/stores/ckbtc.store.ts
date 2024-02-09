import { initCertifiedSetterStore } from '$lib/stores/certified-setter.store';
import type { CertifiedData } from '$lib/types/store';
import type { MinterInfo, PendingUtxo } from '@dfinity/ckbtc';

export type CkBtcMinterInfoData = CertifiedData<MinterInfo>;
export const ckBtcMinterInfoStore = initCertifiedSetterStore<CkBtcMinterInfoData>();

export type CkBtcPendingUtxosData = CertifiedData<PendingUtxo[]>;
export const ckBtcPendingUtxosStore = initCertifiedSetterStore<CkBtcPendingUtxosData>();
