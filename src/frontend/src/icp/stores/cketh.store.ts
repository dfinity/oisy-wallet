import { initCertifiedSetterStore } from '$lib/stores/certified-setter.store';
import type { CertifiedData } from '$lib/types/store';
import type { Eip1559TransactionPrice } from '@dfinity/cketh';
import type { TokenId } from '$lib/types/token';

export type Eip1559TransactionPriceData = CertifiedData<Eip1559TransactionPrice>;
export const eip1559TransactionPriceStore = initCertifiedSetterStore<TokenId, Eip1559TransactionPriceData>();
