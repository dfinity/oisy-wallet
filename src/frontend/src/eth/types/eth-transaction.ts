import { ethTransactionTypes } from '$lib/schema/transaction.schema';
import type { Transaction, TransactionType } from '$lib/types/transaction';

export type EthTransactionType = Extract<
	TransactionType,
	(typeof ethTransactionTypes.options)[number]
>;

export interface EthTransactionUi extends Transaction {
	uiType: EthTransactionType;
}
