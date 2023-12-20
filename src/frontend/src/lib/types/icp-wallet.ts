import type {
	GetAccountIdentifierTransactionsResponse,
	TransactionWithId
} from '@dfinity/ledger-icp';

export type JsonTransactionsText = string;

export type IcpWallet = Omit<GetAccountIdentifierTransactionsResponse, 'transactions'> & {
	newTransactions: JsonTransactionsText;
};

export type IcpTransaction = TransactionWithId;
