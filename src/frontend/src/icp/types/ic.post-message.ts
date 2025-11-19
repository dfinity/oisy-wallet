import type { GetAccountIdentifierTransactionsResponse } from '@icp-sdk/canisters/ledger/icp';
import type { IcrcIndexNgGetTransactions } from '@icp-sdk/canisters/ledger/icrc';

export type GetTransactions =
	| Omit<IcrcIndexNgGetTransactions, 'transactions'>
	| Omit<GetAccountIdentifierTransactionsResponse, 'transactions'>;
