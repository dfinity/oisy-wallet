import type { BtcTransactionUi } from '$btc/types/btc';
import type { EthTransactionUi } from '$eth/types/eth-transaction';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import type { Token } from '$lib/types/token';
import type { Transaction } from '$lib/types/transaction';
import type { NonEmptyArray } from '$lib/types/utils';
import type { SolTransactionUi } from '$sol/types/sol-transaction';

export type AnyTransaction = BtcTransactionUi | Transaction | IcTransactionUi | SolTransactionUi;

export type AnyTransactionUi =
	| BtcTransactionUi
	| EthTransactionUi
	| IcTransactionUi
	| SolTransactionUi;

export type AnyTransactionUiWithToken = AnyTransactionUi & {
	token: Token;
};

export type AnyTransactionUiWithCmp =
	| { component: 'bitcoin'; transaction: BtcTransactionUi }
	| { component: 'ethereum'; transaction: EthTransactionUi }
	| { component: 'ic'; transaction: IcTransactionUi }
	| { component: 'solana'; transaction: SolTransactionUi };

export type AllTransactionUiWithCmp = AnyTransactionUiWithCmp & {
	token: Token;
};

export type AllTransactionUiWithCmpNonEmptyList = NonEmptyArray<AllTransactionUiWithCmp>;

export type TransactionsUiDateGroup<T extends AnyTransactionUiWithCmp> = Record<
	string,
	NonEmptyArray<T>
>;
