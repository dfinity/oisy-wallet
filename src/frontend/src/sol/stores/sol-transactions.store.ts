import type { CertifiedStoreData } from '$lib/stores/certified.store';
import {
	initTransactionsStore,
	type CertifiedTransaction,
	type TransactionsData
} from '$lib/stores/transactions.store';
import type { SolTransactionUi } from '$sol/types/sol-transaction';

export type SolCertifiedTransaction = CertifiedTransaction<SolTransactionUi>;

export type SolTransactionsData = TransactionsData<SolTransactionUi>;

export type SolCertifiedTransactionsData = CertifiedStoreData<SolTransactionsData>;

export const solTransactionsStore = initTransactionsStore<SolTransactionUi>();
