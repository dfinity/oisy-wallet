import { initCertifiedSetterStore } from '$lib/stores/certified-setter.store';
import type { CertifiedData } from '$lib/types/store';
import type { MinterInfo } from '@icp-sdk/canisters/ckbtc';

export type CkBtcMinterInfoData = CertifiedData<MinterInfo>;
export const ckBtcMinterInfoStore = initCertifiedSetterStore<CkBtcMinterInfoData>();
