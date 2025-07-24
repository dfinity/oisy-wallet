import type { BtcCertifiedTransactionsData } from '$btc/stores/btc-transactions.store';
import type { EthCertifiedTransactionsData } from '$eth/stores/eth-transactions.store';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { TransactionsData } from '$lib/stores/transactions.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { Token, TokenId } from '$lib/types/token';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import type { Principal } from '@dfinity/principal';

export type IdbTransactionsStoreData =
	| BtcCertifiedTransactionsData
	| EthCertifiedTransactionsData
	| CertifiedStoreData<TransactionsData<IcTransactionUi>>
	| CertifiedStoreData<TransactionsData<SolTransactionUi>>;

export interface SetIdbTransactionsParams<T extends IdbTransactionsStoreData> {
	identity: OptionIdentity;
	tokens: Token[];
	transactionsStoreData: T;
}

export interface GetIdbTransactionsParams {
	principal: Principal;
	tokenId: TokenId;
	networkId: NetworkId;
}
