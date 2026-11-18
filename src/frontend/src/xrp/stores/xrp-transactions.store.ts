import type { CertifiedStoreData } from '$lib/stores/certified.store';
import {
	initTransactionsStore,
	type CertifiedTransaction,
	type TransactionsData
} from '$lib/stores/transactions.store';
import type { XrpTransactionUi } from '$xrp/types/xrp-transaction';
import type { XrpTrustLineTokenIdentity } from '$xrp/types/xrp-trust-line-token';

export type XrpCertifiedTransaction = CertifiedTransaction<XrpTransactionUi>;

// A trust-line token's row as the wallet worker posts it: the worker does not know the tokens, so the
// row carries the currency and issuer its token is found by.
export type XrpTrustLineCertifiedTransaction = XrpTrustLineTokenIdentity & {
	transaction: XrpCertifiedTransaction;
};

export type XrpTransactionsData = TransactionsData<XrpTransactionUi>;

export type XrpCertifiedTransactionsData = CertifiedStoreData<XrpTransactionsData>;

export const xrpTransactionsStore = initTransactionsStore<XrpTransactionUi>();
