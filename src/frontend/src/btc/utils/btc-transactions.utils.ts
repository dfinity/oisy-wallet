import {
	CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS,
	PENDING_BTC_TRANSACTION_MIN_CONFIRMATIONS
} from '$btc/constants/btc.constants';
import type { BtcTransactionUi } from '$btc/types/btc';
import type { BtcAddress } from '$lib/types/address';
import type { BitcoinOutput, BitcoinTransaction } from '$lib/types/blockchain';
import { isNullish, nonNullish } from '@dfinity/utils';

export const mapBtcTransaction = ({
	transaction: { inputs, block_index, out, hash, time },
	btcAddress,
	latestBitcoinBlockHeight
}: {
	transaction: BitcoinTransaction;
	btcAddress: BtcAddress;
	latestBitcoinBlockHeight: number;
}): BtcTransactionUi => {
	const isTypeSend = inputs.some(({ prev_out }) => prev_out.addr === btcAddress);
	const output: BitcoinOutput | undefined = out.find(({ addr }) =>
		isTypeSend ? addr !== btcAddress : addr === btcAddress
	);

	const confirmations = nonNullish(block_index)
		? latestBitcoinBlockHeight - block_index
		: undefined;

	const status =
		isNullish(confirmations) || confirmations <= PENDING_BTC_TRANSACTION_MIN_CONFIRMATIONS
			? 'pending'
			: confirmations >= CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS
				? 'confirmed'
				: 'unconfirmed';

	return {
		id: hash,
		timestamp: BigInt(time),
		value: nonNullish(output?.value) ? BigInt(output.value) : undefined,
		status,
		blockNumber: block_index ?? undefined,
		type: isTypeSend ? 'send' : 'receive',
		from: isTypeSend ? btcAddress : inputs[0].prev_out.addr,
		to: nonNullish(output) ? (isTypeSend ? output.addr : btcAddress) : undefined
	};
};
