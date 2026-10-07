import { IC_CYCLES_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import type { IcToken } from '$icp/types/ic-token';
import type { IcTransactionUi, IcrcTransaction } from '$icp/types/ic-transaction';
import { mapIcrcTransaction } from '$icp/utils/icrc-transactions.utils';
import type { NullishIdentity } from '$lib/types/identity';
import { fromNullable, fromNullishNullable, isNullish, nonNullish } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';

// A top-up's burn memo, as the cycles ledger's `withdraw` writes it: a one-element CBOR
// array (0x81) holding the target canister's ID as a 10-byte string (0x4a).
const TOP_UP_MEMO_PREFIX = [0x81, 0x4a];
const TOP_UP_MEMO_LENGTH = TOP_UP_MEMO_PREFIX.length + 10;

// The memo of the mint that refunds a top-up whose deposit failed.
const TOP_UP_REFUND_MEMO_BYTE = 0xff;
const TOP_UP_REFUND_MEMO_LENGTH = 32;

export const isCyclesLedger = ({ ledgerCanisterId }: Pick<IcToken, 'ledgerCanisterId'>): boolean =>
	ledgerCanisterId === IC_CYCLES_LEDGER_CANISTER_ID;

/**
 * The canister a cycles-ledger burn topped up, read from the burn's memo. Only the exact
 * encoding the ledger writes counts; any other memo is not a top-up.
 */
export const getTopUpCanister = (memo: Uint8Array | undefined): Principal | undefined => {
	if (
		isNullish(memo) ||
		memo.length !== TOP_UP_MEMO_LENGTH ||
		TOP_UP_MEMO_PREFIX.some((byte, index) => memo[index] !== byte)
	) {
		return undefined;
	}

	return Principal.fromUint8Array(memo.slice(TOP_UP_MEMO_PREFIX.length));
};

export const isTopUpRefundMemo = (memo: Uint8Array | undefined): boolean =>
	nonNullish(memo) &&
	memo.length === TOP_UP_REFUND_MEMO_LENGTH &&
	memo.every((byte) => byte === TOP_UP_REFUND_MEMO_BYTE);

/**
 * Maps a cycles-ledger transaction like any ICRC one, and labels a top-up, naming the
 * canister as its destination, and the mint that refunds a failed one. Every other burn
 * and mint keeps its plain label.
 */
export const mapCyclesLedgerTransaction = ({
	transaction,
	identity
}: {
	transaction: IcrcTransaction;
	identity: NullishIdentity;
}): IcTransactionUi => {
	const mapped = mapIcrcTransaction({ transaction, identity });

	const {
		transaction: { burn, mint }
	} = transaction;

	const topUpCanister = getTopUpCanister(fromNullishNullable(fromNullable(burn)?.memo));

	if (nonNullish(topUpCanister)) {
		return { ...mapped, to: topUpCanister.toText(), typeLabel: 'transaction.label.top_up' };
	}

	if (isTopUpRefundMemo(fromNullishNullable(fromNullable(mint)?.memo))) {
		return { ...mapped, typeLabel: 'transaction.label.top_up_refund' };
	}

	return mapped;
};
