import type { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
import type { IcrcIndexNgDid } from '@icp-sdk/canisters/ledger/icrc';

export type GetTransactions =
	| Omit<IcrcIndexNgDid.GetTransactions, 'transactions'>
	| Omit<IcpIndexDid.GetAccountIdentifierTransactionsResponse, 'transactions'>;
