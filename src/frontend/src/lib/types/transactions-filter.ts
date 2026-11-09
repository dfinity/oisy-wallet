import type { TransactionType } from '$lib/types/transaction';

// A top-up is a send on ICP and a burn on the cycles ledger. The filter lists it as a type of
// its own, under neither.
export type TransactionsFilterType = TransactionType | 'top_up';

export interface TransactionsFilter {
	types: TransactionsFilterType[];
	tokenIds: string[];
	contactIds: string[];
}

export const EMPTY_TRANSACTIONS_FILTER: TransactionsFilter = {
	types: [],
	tokenIds: [],
	contactIds: []
};
