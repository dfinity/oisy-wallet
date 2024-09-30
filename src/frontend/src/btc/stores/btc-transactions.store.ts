import type { BtcTransactionUi } from '$btc/types/btc';
import { initTransactionsStore } from '$lib/stores/transactions.store';

export const btcTransactionsStore = initTransactionsStore<BtcTransactionUi>();
