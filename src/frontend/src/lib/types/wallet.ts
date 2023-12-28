export type JsonTransactionsText = string;

export type Wallet<T> = Omit<T, 'transactions'> & {
	newTransactions: JsonTransactionsText;
};
