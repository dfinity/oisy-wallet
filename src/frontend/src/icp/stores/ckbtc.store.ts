import { initCertifiedSetterStore } from '$lib/stores/certified-setter.store';
import type { CertifiedData } from '$lib/types/store';
import type { CkBtcMinterDid } from '@icp-sdk/canisters/ckbtc';

export type CkBtcMinterInfoData = CertifiedData<CkBtcMinterDid.MinterInfo>;
export const ckBtcMinterInfoStore = initCertifiedSetterStore<CkBtcMinterInfoData>();
