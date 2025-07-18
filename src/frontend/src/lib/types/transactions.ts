import type { BtcTransactionUi } from '$btc/types/btc';
import type { EthTransactionsData } from '$eth/stores/eth-transactions.store';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { TransactionsData } from '$lib/stores/transactions.store';
import type { Address } from '$lib/types/address';
import type { Token } from '$lib/types/token';
import type { SolTransactionUi } from '$sol/types/sol-transaction';

export interface TransactionsStoreCheckParams {
	// TODO: set unified type when we harmonize the transaction stores
	transactionsStoreData:
		| CertifiedStoreData<TransactionsData<IcTransactionUi | BtcTransactionUi | SolTransactionUi>>
		| EthTransactionsData;
	tokens: Token[];
}

export interface KnownDestination {
	amounts: { value: bigint; token: Token }[];
	address: Address;
	timestamp?: number;
}

export type KnownDestinations = Record<Address, KnownDestination>;
