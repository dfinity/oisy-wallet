import { ethTransactionTypes } from '$lib/schema/transaction.schema';
import type { Transaction, TransactionType, TransactionUiCommon } from '$lib/types/transaction';

export type EthTransactionType = Extract<
	TransactionType,
	(typeof ethTransactionTypes.options)[number]
>;

export type EthTransactionUi = Transaction & TransactionUiCommon & { uiType: EthTransactionType };
