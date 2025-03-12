import type { AnyTransactionUiWithCmp } from '$lib/types/transaction';

export const createTransactionsUiWithCmp = (n: number): AnyTransactionUiWithCmp[] =>
	Array.from({ length: n }, (_, i) => ({
		transaction: {
			id: `id-${i}`,
			type: 'send',
			status: 'executed',
			transactionComponent: 'transactionComponent',
			timestamp: BigInt(i),
			from: 'from',
			to: 'to'
		},
		component: 'ic'
	}));
