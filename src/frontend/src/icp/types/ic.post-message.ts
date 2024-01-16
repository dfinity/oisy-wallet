// Transactions &  {certified: boolean}
import type { CertifiedData } from '$lib/types/store';

export type JsonTransactionsText = string;

export type PostMessageWalletData<T> = Omit<T, 'transactions' | 'balance'> & {
	balance: CertifiedData<bigint>;
	newTransactions: JsonTransactionsText;
};
