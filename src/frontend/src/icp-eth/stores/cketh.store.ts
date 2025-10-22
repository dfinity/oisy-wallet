import { initCertifiedSetterStore } from '$lib/stores/certified-setter.store';
import type { CertifiedData } from '$lib/types/store';
import type { MinterInfo } from '@icp-sdk/canisters/cketh';

export type CkEthMinterInfoData = CertifiedData<MinterInfo>;
export const ckEthMinterInfoStore = initCertifiedSetterStore<CkEthMinterInfoData>();
