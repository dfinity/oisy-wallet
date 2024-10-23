import { initCertifiedSetterStore } from '$lib/stores/certified-setter.store';
import type { CertifiedData } from '$lib/types/store';
import type { MinterInfo } from '@dfinity/ckbtc';
import type { TokenId } from '$lib/types/token';

export type CkBtcMinterInfoData = CertifiedData<MinterInfo>;
export const ckBtcMinterInfoStore = initCertifiedSetterStore<TokenId, CkBtcMinterInfoData>();
