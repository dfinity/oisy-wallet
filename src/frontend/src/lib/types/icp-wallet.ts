import type { GetAccountIdentifierTransactionsResponse } from '@dfinity/ledger-icp';

export type JsonTransactionsText = string;

export type IcpWallet = Omit<GetAccountIdentifierTransactionsResponse, 'transactions'> & {
	newTransactions: JsonTransactionsText;
};
