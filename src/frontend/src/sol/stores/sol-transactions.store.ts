import { initTransactionsStore, type CertifiedTransaction } from '$lib/stores/transactions.store';
import type { SolTransactionUi } from '$sol/types/sol-transaction';

export type SolCertifiedTransaction = CertifiedTransaction<SolTransactionUi>;

export const solTransactionsStore = initTransactionsStore<SolTransactionUi>();
