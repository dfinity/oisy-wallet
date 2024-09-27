import type { BtcTransactionStatus, BtcTransactionUi } from '$btc/types/btc';
import type { BtcAddress } from '$lib/types/address';
import type { BitcoinOutput, BitcoinTransaction } from '$lib/types/blockchain';
import type { TransactionType } from '$lib/types/transaction';
import { nonNullish } from '@dfinity/utils';

export const mapBtcTransaction = ({
	transaction,
	btcAddress
}: {
	transaction: BitcoinTransaction;
	btcAddress: BtcAddress;
}): BtcTransactionUi => {
	const type: TransactionType = transaction.inputs.some(
		(input) => input.prev_out.addr === btcAddress
	)
		? 'send'
		: 'receive';
	let amount = 0;
	let senderAddress = '';
	let receiverAddress = '';
	let blockNumber;
	let output: BitcoinOutput | undefined;
	let status: BtcTransactionStatus = 'pending';

	if (nonNullish(transaction.block_index)) {
		blockNumber = transaction.block_index;
		status = 'confirmed';
	}

	if (type === 'send') {
		senderAddress = btcAddress;

		output = transaction.out.find((output) => output.addr !== btcAddress);
		if (nonNullish(output)) {
			receiverAddress = output.addr;
			amount = output.value;
		}
	} else {
		senderAddress = transaction.inputs[0].prev_out.addr;

		output = transaction.out.find((output) => output.addr === btcAddress);
		if (nonNullish(output)) {
			receiverAddress = btcAddress;
			amount = output.value;
		}
	}

	return {
		hash: transaction.hash,
		timestamp: transaction.time,
		value: BigInt(amount),
		status,
		blockNumber,
		type,
		from: senderAddress,
		to: receiverAddress
	};
};
