import type { EthAddress } from '$eth/types/address';
import type { ethTransactionTypes } from '$lib/schema/transaction.schema';
import type {
	Transaction,
	TransactionId,
	TransactionType,
	TransactionUiCommon,
	TransactionUiDisplay
} from '$lib/types/transaction';

export type EthTransactionType = Extract<
	TransactionType,
	(typeof ethTransactionTypes.options)[number]
>;

export interface EthTransactionUiDisplay extends TransactionUiDisplay {
	displayValue?: bigint;
	approveValue?: bigint;
	isUnlimitedApprove?: boolean;
	isErc20Deposit?: boolean;
}

export interface EthTransactionUi
	extends Omit<Transaction, 'type'>,
		TransactionUiCommon<EthTransactionUiDisplay, number> {
	id: TransactionId;
	type: EthTransactionType;
	approveSpender?: EthAddress;
	display?: EthTransactionUiDisplay;
}
