import type { BtcCertifiedTransactionsData } from '$btc/stores/btc-transactions.store';
import type { EthCertifiedTransactionsData } from '$eth/stores/eth-transactions.store';
import type { IcCertifiedTransactionsData } from '$icp/stores/ic-transactions.store';
import type { Address } from '$lib/types/address';
import type { Token } from '$lib/types/token';
import type { SolCertifiedTransactionsData } from '$sol/stores/sol-transactions.store';

export interface TransactionsStoreCheckParams {
	transactionsStoreData:
		| BtcCertifiedTransactionsData
		| EthCertifiedTransactionsData
		| IcCertifiedTransactionsData
		| SolCertifiedTransactionsData;
	tokens: Token[];
}

export interface KnownDestination {
	amounts: { value: bigint; token: Token }[];
	address: Address;
	timestamp?: number;
}

export type KnownDestinations = Record<Address, KnownDestination>;
