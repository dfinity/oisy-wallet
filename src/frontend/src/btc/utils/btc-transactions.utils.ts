import { CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS } from '$btc/constants/btc.constants';
import type { BtcTransactionUi } from '$btc/types/btc';
import type { BtcAddress } from '$lib/types/address';
import type { BitcoinTransaction } from '$lib/types/blockchain';
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
	// Step 1: Calculate total input value and determine if the transaction is a "send"
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

	// Step 2: Analyse outputs to determine total value, destination addresses, and whether it's a self-transaction
	const { totalOutputValue, totalValue, to, selfTransaction } = out.reduce<{
		to: string[];
		totalValue: number | undefined;
		totalOutputValue: number;
		selfTransaction: boolean;
	}>(
		(acc, output) => {
			const { addr, value } = output;

			// For 'send' tx: include outputs not to the sender
			// For 'receive' tx: include only outputs to the user
			const isValidOutput =
				(isTypeSend && addr !== btcAddress) || (!isTypeSend && addr === btcAddress);

			return {
				...acc,
				totalValue: isValidOutput ? (acc.totalValue ?? 0) + value : acc.totalValue,
				to: isValidOutput ? [...acc.to, addr] : acc.to,
				totalOutputValue: acc.totalOutputValue + value,
				// If all outputs are to the sender, it's a self-transaction
				selfTransaction: acc.selfTransaction && addr === btcAddress
			};
		},
		{
			totalOutputValue: 0,
			totalValue: undefined,
			to: [],
			selfTransaction: true
		}
	);

	// Step 3: Calculate the transaction fee from the difference between input and output values
	const utxosFee = totalInputValue - totalOutputValue;

	// Step 4: Compute the number of confirmations
	// +1 is needed to account for the block where the transaction was first included
	const confirmations = nonNullish(block_index)
		? latestBitcoinBlockHeight - block_index + 1
		: undefined;

	// Step 5: Derive transaction status based on confirmations thresholds
	const status = isNullish(confirmations)
		? 'pending'
		: confirmations >= CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS
			? 'confirmed'
			: 'unconfirmed';

	// Step 6: Determine the value of the transaction
	const value = selfTransaction
		? // For self-transactions, we consider the total output value plus the fee, since that is logically the value spent for the presumable 'send' transaction
			BigInt(totalOutputValue + utxosFee)
		: nonNullish(totalValue)
			? // For 'send' transactions, we consider the total value sent plus the fee, since that is logically the value spent for the transaction
				BigInt(isTypeSend ? totalValue + utxosFee : totalValue)
			: undefined;

	// Step 7: Compose the final structured BTC transaction object for the UI
	return {
		id: hash,
		timestamp: BigInt(time),
		value,
		status,
		blockNumber: block_index ?? undefined,
		type: isTypeSend ? 'send' : 'receive',
		from: isTypeSend ? btcAddress : inputs[0].prev_out.addr,
		to: selfTransaction ? [btcAddress] : to,
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
