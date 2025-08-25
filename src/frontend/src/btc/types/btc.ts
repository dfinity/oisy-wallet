import type {
	TransactionStatus,
	TransactionType,
	TransactionUiCommon
} from '$lib/types/transaction';

export type BtcTransactionStatus = TransactionStatus;

export interface BtcTransactionUi extends TransactionUiCommon {
	id: string;
	type: TransactionType;
	status: BtcTransactionStatus;
	value?: bigint;

	/* TODO: add one more field "confirmations", a number that represents the acceptance of a new block by the blockchain network.
	 1. Use https://blockchain.info/latestblock to get info about the latest block height.
	 2. Calculate confirmations: confirmations = currentBlockHeight - transactionBlockHeight + 1
	 */
}
