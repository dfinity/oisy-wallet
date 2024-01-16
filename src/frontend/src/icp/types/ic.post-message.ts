// Transactions &  {certified: boolean}
export type JsonTransactionsText = string;

export type PostMessageWalletData<T> = Omit<T, 'transactions'> & {
	newTransactions: JsonTransactionsText;
};
