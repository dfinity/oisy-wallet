import type { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
import type { IcrcIndexDid } from '@icp-sdk/canisters/ledger/icrc';

export type GetTransactions =
	| Omit<IcrcIndexDid.GetTransactions, 'transactions'>
	| Omit<IcpIndexDid.GetAccountIdentifierTransactionsResponse, 'transactions'>;
