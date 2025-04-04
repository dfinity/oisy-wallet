import { CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS } from '$btc/constants/btc.constants';
import type { BtcTransactionUi } from '$btc/types/btc';
import type { BtcAddress } from '$lib/types/address';
import type { BitcoinTransaction } from '$lib/types/blockchain';
import { isNullish, nonNullish } from '@dfinity/utils';

// TODO: Add docs/comments to the steps needed to parse a BTC tx
export const mapBtcTransaction = ({
	transaction: { inputs, block_index, out, hash, time },
	btcAddress,
	latestBitcoinBlockHeight
}: {
	transaction: BitcoinTransaction;
	btcAddress: BtcAddress;
	latestBitcoinBlockHeight: number;
}): BtcTransactionUi => {
	const { totalInputValue, isTypeSend } = inputs.reduce<{
		totalInputValue: number;
		isTypeSend: boolean;
	}>(
		(acc, { prev_out: { value, addr } }) => ({
			totalInputValue: acc.totalInputValue + value,
			isTypeSend: acc.isTypeSend ? acc.isTypeSend : addr === btcAddress
		}),
		{
			totalInputValue: 0,
			isTypeSend: false
		}
	);

	const { totalOutputValue, totalValue, to } = out.reduce<{
		to: string[];
		totalValue: number | undefined;
		totalOutputValue: number;
	}>(
		(acc, output) => {
			const { addr, value } = output;
			// TODO: test what happens when user sends to the current address (hence isValidOutput = false)
			const isValidOutput =
				(isTypeSend && addr !== btcAddress) || (!isTypeSend && addr === btcAddress);

			return {
				...acc,
				totalValue: isValidOutput ? (acc.totalValue ?? 0) + value : acc.totalValue,
				to: isValidOutput ? [...acc.to, addr] : acc.to,
				totalOutputValue: acc.totalOutputValue + value
			};
		},
		{
			totalOutputValue: 0,
			totalValue: undefined,
			to: []
		}
	);

	const utxosFee = totalInputValue - totalOutputValue;

	// +1 is needed to account for the block where the transaction was first included
	const confirmations = nonNullish(block_index)
		? latestBitcoinBlockHeight - block_index + 1
		: undefined;

	const status = isNullish(confirmations)
		? 'pending'
		: confirmations >= CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS
			? 'confirmed'
			: 'unconfirmed';

	return {
		id: hash,
		timestamp: BigInt(time),
		value: nonNullish(totalValue)
			? BigInt(isTypeSend ? totalValue + utxosFee : totalValue)
			: undefined,
		status,
		blockNumber: block_index ?? undefined,
		type: isTypeSend ? 'send' : 'receive',
		from: isTypeSend ? btcAddress : inputs[0].prev_out.addr,
		to,
		confirmations
	};
};

export const sortBtcTransactions = ({
	transactionA: { status: statusA, timestamp: timestampA },
	transactionB: { status: statusB, timestamp: timestampB }
}: {
	transactionA: BtcTransactionUi;
	transactionB: BtcTransactionUi;
}): number => {
	const isPendingA = statusA === 'pending';
	const isPendingB = statusB === 'pending';
	const isUnconfirmedA = statusA === 'unconfirmed';
	const isUnconfirmedB = statusB === 'unconfirmed';

	if (isPendingA && !isPendingB) {
		return -1;
	}

	if (isPendingB && !isPendingA) {
		return 1;
	}

	if (isUnconfirmedA && !isUnconfirmedB) {
		return -1;
	}

	if (isUnconfirmedB && !isUnconfirmedA) {
		return 1;
	}

	if (nonNullish(timestampA) && nonNullish(timestampB)) {
		return Number(timestampB - timestampA);
	}

	return nonNullish(timestampA) ? -1 : 1;
};
