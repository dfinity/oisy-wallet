import type { JsonTransactionsText } from '$lib/types/wallet';
import type { IcrcGetTransactions } from '@dfinity/ledger-icrc';

export type IcrcWallet = Omit<IcrcGetTransactions, 'transactions'> & {
	newTransactions: JsonTransactionsText;
};
