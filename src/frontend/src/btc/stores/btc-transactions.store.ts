import type { BtcTransactionUi } from '$btc/types/btc';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import { initTransactionsStore, type TransactionsData } from '$lib/stores/transactions.store';

export type BtcTransactionsData = TransactionsData<BtcTransactionUi>;

export type BtcCertifiedTransactionsData = CertifiedStoreData<BtcTransactionsData>;

export const btcTransactionsStore = initTransactionsStore<BtcTransactionUi>();
