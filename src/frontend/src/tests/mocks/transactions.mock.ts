import type { AnyTransactionUi } from '$lib/types/transaction';

export const createTransactionsUi = (n: number): AnyTransactionUi[] =>
	Array.from({ length: n }, (_, i) => ({
		id: `id-${i}`,
		type: 'send',
		status: 'executed',
		transactionComponent: 'transactionComponent',
		timestamp: BigInt(i),
		from: 'from',
		to: 'to'
	}));
