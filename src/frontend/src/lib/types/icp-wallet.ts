import type { JsonTransactionsText } from '$lib/types/wallet';
import type {
	GetAccountIdentifierTransactionsResponse,
	TransactionWithId
} from '@dfinity/ledger-icp';

export type IcpWallet = Omit<GetAccountIdentifierTransactionsResponse, 'transactions'> & {
	newTransactions: JsonTransactionsText;
};

export type IcpTransaction = TransactionWithId;
