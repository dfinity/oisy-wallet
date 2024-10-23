import { initCertifiedSetterStore } from '$lib/stores/certified-setter.store';
import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';
import type { MinterInfo } from '@dfinity/cketh';

export type CkEthMinterInfoData = CertifiedData<MinterInfo>;
export const ckEthMinterInfoStore = initCertifiedSetterStore<TokenId, CkEthMinterInfoData>();
