import type { TransactionType } from '$lib/types/transaction';

export type BtcTransactionType = Exclude<
	TransactionType,
	'withdraw' | 'deposit' | 'approve' | 'burn' | 'mint'
>;
