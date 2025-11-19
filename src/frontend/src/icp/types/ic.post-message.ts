import type { IcrcIndexNgGetTransactions } from '@dfinity/ledger-icrc';
import type { GetAccountIdentifierTransactionsResponse } from '@icp-sdk/canisters/ledger/icp';

export type GetTransactions =
	| Omit<IcrcIndexNgGetTransactions, 'transactions'>
	| Omit<GetAccountIdentifierTransactionsResponse, 'transactions'>;
