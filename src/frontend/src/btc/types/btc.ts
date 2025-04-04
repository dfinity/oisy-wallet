import type { BtcTransactionType } from '$btc/types/btc-transaction';
import type { TransactionId, TransactionStatus, TransactionUiCommon } from '$lib/types/transaction';

export type BtcTransactionStatus = TransactionStatus;

export interface BtcTransactionUi extends Omit<TransactionUiCommon, 'to'> {
	id: TransactionId;
	type: BtcTransactionType;
	status: BtcTransactionStatus;
	value?: bigint;
	confirmations?: number;

	// BTC transaction can have multiple recipients
	to?: string[];

	/* TODO: add one more field "confirmations", a number that represents the acceptance of a new block by the blockchain network.
	 1. Use https://blockchain.info/latestblock to get info about the latest block height.
	 2. Calculate confirmations: confirmations = currentBlockHeight - transactionBlockHeight + 1
	 */
}
