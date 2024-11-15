import type { IcTransactionUi } from '$icp/types/ic-transaction';

export const createMockIcTransactionsUi = (n: number): IcTransactionUi[] =>
	Array.from({ length: n }, () => ({
		id: Math.random().toString(36).substring(7),
		type: 'send',
		status: 'executed'
	}));
