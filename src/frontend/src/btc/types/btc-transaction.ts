import type { TransactionType } from '$lib/types/transaction';

export type BtcTransactionType = Extract<TransactionType, 'send' | 'receive'>;
