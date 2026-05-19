import { CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS } from '$btc/constants/btc.constants';
import type { BtcAddress } from '$btc/types/address';
import type { BtcTransactionUi } from '$btc/types/btc';
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
	// Step 1: Aggregate input/output values split by user vs. others.
	const inputsFromUser = inputs.reduce(
		(acc, { prev_out: { addr, value } }) => acc + (addr === btcAddress ? value : 0),
		0
	);

	const { outputsToUser, outputsToOthers, recipients } = out.reduce<{
		outputsToUser: number;
		outputsToOthers: number;
		recipients: string[];
	}>(
		(acc, { addr, value }) =>
			addr === btcAddress
				? { ...acc, outputsToUser: acc.outputsToUser + value }
				: {
						...acc,
						outputsToOthers: acc.outputsToOthers + value,
						recipients: [...acc.recipients, addr]
					},
		{ outputsToUser: 0, outputsToOthers: 0, recipients: [] }
	);

	// Step 2: Classify by net flow. The user "received" if more BTC came into their
	// address than left it. Otherwise it's a send (including the zero-net consolidation case).
	const isReceive = outputsToUser > inputsFromUser;

	// Step 3: Derive the displayable amount and the fee attributable to the user.
	// For a send, the user's net spend (rawNet) is capped at what actually went to
	// other recipients; any excess is the user's share of the network fee.
	const rawNet = inputsFromUser - outputsToUser;
	const sendAmount = Math.min(rawNet, outputsToOthers);
	const value = BigInt(isReceive ? outputsToUser - inputsFromUser : sendAmount);
	const fee = isReceive ? undefined : BigInt(rawNet - sendAmount);

	// Step 4: Resolve confirmations / status from the latest block height.
	// +1 accounts for the block where the transaction was first included.
	const confirmations = nonNullish(block_index)
		? latestBitcoinBlockHeight - block_index + 1
		: undefined;

	const status = isNullish(confirmations)
		? 'pending'
		: confirmations >= CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS
			? 'confirmed'
			: 'unconfirmed';

	// Step 5: Pick a sensible counterparty for from/to. For a receive, prefer the
	// first non-user input as the sender (falls back to inputs[0] when all inputs
	// happen to be user-owned, which shouldn't occur for an isReceive transaction).
	const from = isReceive
		? (inputs.find(({ prev_out: { addr } }) => addr !== btcAddress)?.prev_out.addr ??
			inputs[0].prev_out.addr)
		: btcAddress;

	// On a send with zero non-user outputs (consolidation), fall back to the user's
	// own address so the list row has a counterparty to render. Every output in
	// this branch literally has `addr === btcAddress`, so this is the true
	// destination, not a guess.
	const to = isReceive || recipients.length === 0 ? [btcAddress] : recipients;

	return {
		id: hash,
		timestamp: BigInt(time),
		value,
		fee,
		status,
		blockNumber: block_index ?? undefined,
		type: isReceive ? 'receive' : 'send',
		from,
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
