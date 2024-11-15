import type { IcTransactionUi } from '$icp/types/ic-transaction';

export const createMockIcTransactionsUi = (n: number): IcTransactionUi[] =>
	Array.from({ length: n }, () => ({
		id: crypto.randomUUID(),
		type: 'send',
		status: 'executed'
	}));
