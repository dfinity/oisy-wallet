import type { GetAccountIdentifierTransactionsResponse } from '@dfinity/ledger-icp';

export type JsonTransactionsText = string;

export type ICPWallet = Omit<GetAccountIdentifierTransactionsResponse, 'transactions'> & {
	newTransactions: JsonTransactionsText;
};
