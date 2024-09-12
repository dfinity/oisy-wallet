import type { Transaction, TransactionType } from '$lib/types/transaction';

export type EthTransactionType = TransactionType | 'withdraw' | 'deposit';

export interface EthTransactionUi extends Omit<Transaction, 'type'> {
	uiType: EthTransactionType;
}
