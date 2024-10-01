import type { BtcTransactionUi } from '$btc/types/btc';
import type { BtcAddress } from '$lib/types/address';
import type { BitcoinOutput, BitcoinTransaction } from '$lib/types/blockchain';
import { nonNullish } from '@dfinity/utils';

export const mapBtcTransaction = ({
	transaction: { inputs, block_index, out, hash, time },
	btcAddress
}: {
	transaction: BitcoinTransaction;
	btcAddress: BtcAddress;
}): BtcTransactionUi => {
	const isTypeSend = inputs.some(({ prev_out }) => prev_out.addr === btcAddress);
	const blockIndexAvailable = nonNullish(block_index);
	const output: BitcoinOutput | undefined = out.find(({ addr }) =>
		isTypeSend ? addr !== btcAddress : addr === btcAddress
	);

	return {
		id: hash,
		timestamp: time,
		value: nonNullish(output?.value) ? BigInt(output.value) : undefined,
		status: blockIndexAvailable ? 'confirmed' : 'pending',
		blockNumber: block_index ?? undefined,
		type: isTypeSend ? 'send' : 'receive',
		from: isTypeSend ? btcAddress : inputs[0].prev_out.addr,
		to: nonNullish(output) ? (isTypeSend ? output.addr : btcAddress) : undefined
	};
};
