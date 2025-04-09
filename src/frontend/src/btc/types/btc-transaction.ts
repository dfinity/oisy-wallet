import type { btcTransactionTypes } from '$lib/schema/transaction.schema';
import type { TransactionType } from '$lib/types/transaction';

export type BtcTransactionType = Extract<
	TransactionType,
	(typeof btcTransactionTypes.options)[number]
>;
