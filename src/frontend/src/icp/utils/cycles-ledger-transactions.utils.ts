import { IC_CYCLES_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import { CYCLES_LEDGER_DEPOSIT_FEE } from '$icp/constants/cmc.constants';
import type { IcToken } from '$icp/types/ic-token';
import type { IcTransactionUi, IcrcTransaction } from '$icp/types/ic-transaction';
import { isTopUpRefundMemo } from '$icp/utils/cycles-ledger.utils';
import { mapIcrcTransaction } from '$icp/utils/icrc-transactions.utils';
import type { NullishIdentity } from '$lib/types/identity';
import { fromNullable, fromNullishNullable, isNullish, nonNullish } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';

// A top-up's burn memo, as the cycles ledger's `withdraw` writes it: a one-element CBOR
// array (0x81) holding the target canister's ID as a 10-byte string (0x4a).
const TOP_UP_MEMO_PREFIX = [0x81, 0x4a];
const TOP_UP_MEMO_LENGTH = TOP_UP_MEMO_PREFIX.length + 10;

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

/**
 * Maps a cycles-ledger transaction like any ICRC one, and labels a top-up, naming the
 * canister as its destination, and the mint that refunds a failed one. Every other burn
 * and mint keeps its plain label.
 *
 * A burn also gets the ledger's fee. `withdraw` and `create_canister` take the amount plus
 * the ledger's one fee (`config::FEE`, the same 0.0001 TCYCLES a deposit pays), but the
 * cycles ledger's index leaves the burn's `fee` empty. With it, a burn shows like a send:
 * the amount plus the fee out of the balance, and the fee in its details.
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

	const burnData = fromNullable(burn);

	const charged: IcTransactionUi = nonNullish(burnData)
		? { ...mapped, fee: fromNullable(burnData.fee) ?? CYCLES_LEDGER_DEPOSIT_FEE }
		: mapped;

	const topUpCanister = getTopUpCanister(fromNullishNullable(burnData?.memo));

	if (nonNullish(topUpCanister)) {
		return { ...charged, to: topUpCanister.toText(), typeLabel: 'transaction.label.top_up' };
	}

	if (isTopUpRefundMemo(fromNullishNullable(fromNullable(mint)?.memo))) {
		return { ...mapped, typeLabel: 'transaction.label.top_up_refund' };
	}

	return charged;
};
