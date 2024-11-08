import type { Transaction, TransactionType } from '$lib/types/transaction';

export type EthTransactionType = Extract<
	TransactionType,
	'send' | 'receive' | 'withdraw' | 'deposit'
>;

export interface EthTransactionUi extends Transaction {
	uiType: EthTransactionType;
}
