import type { BtcCertifiedTransactionsData } from '$btc/stores/btc-transactions.store';
import type { EthCertifiedTransactionsData } from '$eth/stores/eth-transactions.store';
import type { IcCertifiedTransactionsData } from '$icp/stores/ic-transactions.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { Token, TokenId } from '$lib/types/token';
import type { SolCertifiedTransactionsData } from '$sol/stores/sol-transactions.store';
import type { Principal } from '@dfinity/principal';

export type IdbTransactionsStoreData =
	| BtcCertifiedTransactionsData
	| EthCertifiedTransactionsData
	| IcCertifiedTransactionsData
	| SolCertifiedTransactionsData;

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
