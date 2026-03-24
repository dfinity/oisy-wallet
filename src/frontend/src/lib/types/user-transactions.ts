import type { GetUserTransactionsResponse } from '$lib/types/api';
import type { Transaction as EthTransaction } from '$lib/types/transaction';

export type LoadUserTransactionsResult<T extends EthTransaction> = Omit<
	GetUserTransactionsResponse,
	'transactions'
> & {
	transactions: T[];
};
