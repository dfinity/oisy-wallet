import type { IcpTransaction } from '$lib/types/icp';
import type { IcrcTransactionWithId } from '@dfinity/ledger-icrc';

export type JsonTransactionsText = string;

export type Wallet<T> = Omit<T, 'transactions'> & {
	newTransactions: JsonTransactionsText;
};

export type WalletTransaction = IcpTransaction | IcrcTransactionWithId;
