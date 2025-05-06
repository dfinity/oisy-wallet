import type { BtcTransactionUi } from '$btc/types/btc';
import type { EthTransactionsData } from '$eth/stores/eth-transactions.store';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { TransactionsData } from '$lib/stores/transactions.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { Token } from '$lib/types/token';
import type { SolTransactionUi } from '$sol/types/sol-transaction';

export type IdbTransactionsStoreData =
	| EthTransactionsData
	| CertifiedStoreData<TransactionsData<IcTransactionUi | BtcTransactionUi | SolTransactionUi>>;

export interface SetIdbTransactionsParams<T extends IdbTransactionsStoreData> {
	identity: OptionIdentity;
	tokens: Token[];
	transactionsStoreData: T;
}
