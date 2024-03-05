import { initCertifiedSetterStore } from '$lib/stores/certified-setter.store';
import type { CertifiedData } from '$lib/types/store';
import type { Eip1559TransactionPrice, MinterInfo } from '@dfinity/cketh';

export type Eip1559TransactionPriceData = CertifiedData<Eip1559TransactionPrice>;
export const eip1559TransactionPriceStore = initCertifiedSetterStore<Eip1559TransactionPriceData>();

export type CkEthMinterInfoData = CertifiedData<MinterInfo>;
export const ckEthMinterInfoStore = initCertifiedSetterStore<CkEthMinterInfoData>();
