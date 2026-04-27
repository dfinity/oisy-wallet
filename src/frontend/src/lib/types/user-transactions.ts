import type { GetUserTransactionsResponse } from '$lib/types/api';
import type { Transaction as EthTransaction } from '$lib/types/transaction';
import type { SolTransactionUi } from '$sol/types/sol-transaction';

export type LoadUserTransactionsResult<T extends EthTransaction | SolTransactionUi> = Omit<
	GetUserTransactionsResponse,
	'transactions'
> & {
	transactions: T[];
};
