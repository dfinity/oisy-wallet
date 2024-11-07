import type { Transaction, TransactionType } from '$lib/types/transaction';

export type EthTransactionType = Exclude<TransactionType, 'approve' | 'burn' | 'mint'>;

export interface EthTransactionUi extends Transaction {
	uiType: EthTransactionType;
}
