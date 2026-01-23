import type { CertifiedStoreData } from '$lib/stores/certified.store';
import {
	initTransactionsStore,
	type CertifiedTransaction,
	type TransactionsData
} from '$lib/stores/transactions.store';
import type { KaspaTransactionUi } from '$kaspa/types/kaspa-transaction';

export type KaspaCertifiedTransaction = CertifiedTransaction<KaspaTransactionUi>;

export type KaspaTransactionsData = TransactionsData<KaspaTransactionUi>;

export type KaspaCertifiedTransactionsData = CertifiedStoreData<KaspaTransactionsData>;

export const kaspaTransactionsStore = initTransactionsStore<KaspaTransactionUi>();
