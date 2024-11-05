import type { IcTransactionUi } from '$icp/types/ic-transaction';
import {
	initTransactionsStore,
	type CertifiedTransaction,
	type TransactionsData
} from '$lib/stores/transactions.store';

export type IcCertifiedTransaction = CertifiedTransaction<IcTransactionUi>;

export type IcTransactionsData = TransactionsData<IcTransactionUi>;

export const icTransactionsStore = initTransactionsStore<IcTransactionUi>();
