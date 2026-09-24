import type { CertifiedStoreData } from '$lib/stores/certified.store';
import {
	initTransactionsStore,
	type CertifiedTransaction,
	type TransactionsData
} from '$lib/stores/transactions.store';
import type { XrpTransactionUi } from '$xrp/types/xrp-transaction';

export type XrpCertifiedTransaction = CertifiedTransaction<XrpTransactionUi>;

export type XrpTransactionsData = TransactionsData<XrpTransactionUi>;

export type XrpCertifiedTransactionsData = CertifiedStoreData<XrpTransactionsData>;

export const xrpTransactionsStore = initTransactionsStore<XrpTransactionUi>();
