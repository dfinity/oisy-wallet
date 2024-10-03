import type { TransactionType } from '$lib/types/transaction';

export type BtcTransactionStatus = 'confirmed' | 'pending';

export interface BtcTransactionUi {
	id: string;
	timestamp?: bigint;
	value?: bigint;
	type: TransactionType;
	status: BtcTransactionStatus;
	from: string;
	to?: string;
	// The block number available only if a transaction has been confirmed
	blockNumber?: number;

	/* TODO: add one more field "confirmations", a number that represents the acceptance of a new block by the blockchain network.
	 1. Use https://blockchain.info/latestblock to get info about the latest block height.
	 2. Calculate confirmations: confirmations = currentBlockHeight - transactionBlockHeight + 1
	 */
}
