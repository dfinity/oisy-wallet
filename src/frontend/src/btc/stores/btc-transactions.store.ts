import type { BtcTransactionUi } from '$btc/types/btc';
import { initTransactionsStore, type TransactionsData } from '$lib/stores/transactions.store';

export type BtcTransactionsData = TransactionsData<BtcTransactionUi>;

export const btcTransactionsStore = initTransactionsStore<BtcTransactionUi>();
