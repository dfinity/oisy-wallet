import type { TransactionType } from '$lib/types/transaction';

export interface TransactionsFilter {
	types: TransactionType[];
	tokenIds: string[];
	contactIds: string[];
}

export const EMPTY_TRANSACTIONS_FILTER: TransactionsFilter = {
	types: [],
	tokenIds: [],
	contactIds: []
};
