import type { IcTransactionUi } from '$icp/types/ic-transaction';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import {
	initTransactionsStore,
	type CertifiedTransaction,
	type TransactionsData
} from '$lib/stores/transactions.store';

export type IcCertifiedTransaction = CertifiedTransaction<IcTransactionUi>;

export type IcTransactionsData = TransactionsData<IcTransactionUi>;

export type IcCertifiedTransactionsData = CertifiedStoreData<IcTransactionsData>;

export const icTransactionsStore = initTransactionsStore<IcTransactionUi>();
