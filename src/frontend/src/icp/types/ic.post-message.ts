import type { CertifiedData } from '$lib/types/store';
import type { GetAccountIdentifierTransactionsResponse } from '@dfinity/ledger-icp';
import type { IcrcGetTransactions } from '@dfinity/ledger-icrc';

// Transactions & {certified: boolean}
export type JsonTransactionsText = string;

export type PostMessageWalletData<T> = Omit<T, 'transactions' | 'balance'> & {
	balance: CertifiedData<bigint>;
	newTransactions: JsonTransactionsText;
};

export type GetTransactions =
	| Omit<IcrcGetTransactions, 'transactions'>
	| Omit<GetAccountIdentifierTransactionsResponse, 'transactions'>;
