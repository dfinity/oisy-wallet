import type { ethTransactionTypes } from '$lib/schema/transaction.schema';
import type { Transaction, TransactionId, TransactionType } from '$lib/types/transaction';

export type EthTransactionType = Extract<
	TransactionType,
	(typeof ethTransactionTypes.options)[number]
>;

export interface EthTransactionUi extends Omit<Transaction, 'type'> {
	id: TransactionId;
	type: EthTransactionType;
}
