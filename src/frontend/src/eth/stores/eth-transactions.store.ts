import type { CertifiedStoreData } from '$lib/stores/certified.store';
import {
	type CertifiedTransaction,
	initTransactionsStore,
	type TransactionsData
} from '$lib/stores/transactions.store';
import type { Transaction } from '$lib/types/transaction';

export type EthCertifiedTransaction = CertifiedTransaction<Transaction>;

export type EthTransactionsData = TransactionsData<Transaction>;

export type EthCertifiedTransactionsData = CertifiedStoreData<EthTransactionsData>;

export const ethTransactionsStore = initTransactionsStore<Transaction>();
