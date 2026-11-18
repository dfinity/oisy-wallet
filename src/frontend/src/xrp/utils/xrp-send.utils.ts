import { ZERO } from '$lib/constants/app.constants';
import type { Address } from '$lib/types/address';
import { isNullishOrEmpty } from '$lib/utils/input.utils';
import {
	XRP_ACCOUNT_FLAG_DEPOSIT_AUTH,
	XRP_ACCOUNT_FLAG_GLOBAL_FREEZE,
	XRP_ACCOUNT_FLAG_REQUIRE_AUTH,
	XRP_BASE_RESERVE_DROPS,
	XRP_OWNER_RESERVE_DROPS
} from '$xrp/constants/xrp.constants';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import type { XrpPaymentRefusal } from '$xrp/types/xrp-send';
import type { XrpTrustLine } from '$xrp/types/xrp-trust-line';
import { invalidXrpAddress } from '$xrp/utils/xrp-address.utils';
import { hasXrpAccountFlag, parseXrpTokenValue } from '$xrp/utils/xrp-trust-line.utils';
import { isNullish } from '@dfinity/utils';

/**
 * Drops the account must retain to stay on-ledger: the base reserve plus the owner reserve
 * for every ledger object it owns (trust lines, offers, escrows, …).
 *
 * The base reserve alone is not the requirement — an account holding even one trust line
 * must keep more, and spending down to the base would make the transaction fail.
 */
export const getXrpReserveDrops = ({ ownerCount }: { ownerCount: number }): XrpBalance =>
	XRP_BASE_RESERVE_DROPS + BigInt(ownerCount) * XRP_OWNER_RESERVE_DROPS;

/**
 * Maximum sendable XRP in drops: the balance minus the transaction fee and the reserve the
 * ledger requires the account to retain. Never negative.
 */
export const getXrpMaxAmount = ({
	balance,
	fee,
	ownerCount
}: {
	balance: XrpBalance;
	fee: XrpBalance;
	ownerCount: number;
}): XrpBalance => {
	const max = balance - fee - getXrpReserveDrops({ ownerCount });

	return max > ZERO ? max : ZERO;
};

/**
 * Whether a destination is present but not a valid XRPL address.
 *
 * An absent or empty one is NOT invalid: it is unfilled, and required-field validation belongs to
 * the form. Same contract as `isInvalidDestinationSol`, `isInvalidDestinationBtc` and the ICP
 * validator, all of which return `false` for that case — a shared-shaped helper that answered
 * differently for one chain would give any consumer without a length gate of its own a different
 * answer for XRP than for everything else.
 */
export const isInvalidDestinationXrp = (destination: Address | undefined): boolean => {
	if (isNullishOrEmpty(destination)) {
		return false;
	}

	return invalidXrpAddress(destination);
};

/**
 * Whether `amount` still fits once the fee and the reserve the account must retain are set aside.
 *
 * Checked again at send time, not only at input: `TokenInputContent` revalidates on amount/token
 * change alone, so the fee poller can raise the requirement underneath an already-accepted amount
 * and the review step would be stale too.
 */
export const isXrpAmountSendable = ({
	amount,
	balance,
	fee,
	reserve
}: {
	amount: XrpBalance;
	balance: XrpBalance;
	fee: XrpBalance;
	reserve: XrpBalance;
}): boolean => amount <= balance - fee - reserve;

/**
 * Whether the ledger checks that the recipient preauthorized the sender: only for a recipient with
 * DepositAuth, and for XRP not when both the amount and the recipient's balance are at most the
 * base reserve — rippled lets that through, so such an account cannot lock itself out. A token
 * payment has no such exception.
 */
export const xrpPaymentNeedsDepositPreauth = ({
	destinationFlags,
	destinationBalance,
	xrpAmount
}: {
	destinationFlags: number;
	destinationBalance: XrpBalance;
	// Drops, for an XRP payment; omitted for a token payment.
	xrpAmount?: XrpBalance;
}): boolean => {
	if (!hasXrpAccountFlag({ flags: destinationFlags, flag: XRP_ACCOUNT_FLAG_DEPOSIT_AUTH })) {
		return false;
	}

	if (isNullish(xrpAmount)) {
		return true;
	}

	return xrpAmount > XRP_BASE_RESERVE_DROPS || destinationBalance > XRP_BASE_RESERVE_DROPS;
};

/**
 * Why the ledger would fail a token payment, from the two trust lines it moves along — the
 * sender's and the recipient's, each with the issuer — or `undefined` when nothing on them stops
 * it. Each rule is one rippled applies as a failure that claims the fee (`tecPATH_DRY`,
 * `tecPATH_PARTIAL`).
 *
 * A payment to the issuer moves along the sender's line only, and rippled checks no freeze on it:
 * a frozen holder can still send its tokens back to the issuer.
 */
export const xrpTokenPaymentRefusal = ({
	amount,
	cost,
	senderLine,
	recipientLine,
	toIssuer,
	issuerFlags,
	destinationFlags
}: {
	amount: bigint;
	// What the payment takes from the sender: the amount, and a transfer fee when one applies.
	cost: bigint;
	senderLine: XrpTrustLine | undefined;
	recipientLine: XrpTrustLine | undefined;
	toIssuer: boolean;
	issuerFlags: number;
	destinationFlags: number;
}): XrpPaymentRefusal | undefined => {
	if (isNullish(senderLine) || parseXrpTokenValue({ value: senderLine.balance }) < cost) {
		return 'insufficient_token_balance';
	}

	if (toIssuer) {
		return;
	}

	if (senderLine.deepFreeze || senderLine.deepFreezePeer) {
		return 'deep_frozen';
	}

	if (
		senderLine.freezePeer ||
		hasXrpAccountFlag({ flags: issuerFlags, flag: XRP_ACCOUNT_FLAG_GLOBAL_FREEZE })
	) {
		return 'frozen';
	}

	if (isNullish(recipientLine)) {
		return 'no_trust_line';
	}

	if (
		recipientLine.freeze ||
		recipientLine.deepFreeze ||
		recipientLine.deepFreezePeer ||
		hasXrpAccountFlag({ flags: destinationFlags, flag: XRP_ACCOUNT_FLAG_GLOBAL_FREEZE })
	) {
		return 'destination_frozen';
	}

	if (
		hasXrpAccountFlag({ flags: issuerFlags, flag: XRP_ACCOUNT_FLAG_REQUIRE_AUTH }) &&
		!recipientLine.peerAuthorized
	) {
		return 'destination_not_authorized';
	}

	// rippled refuses to pass a payment through the issuer when its side of both lines blocks
	// rippling.
	if (senderLine.noRipplePeer && recipientLine.noRipplePeer) {
		return 'no_rippling';
	}

	// The recipient's balance rounded up, so its room under the limit is never overstated.
	const room =
		parseXrpTokenValue({ value: recipientLine.limit }) -
		parseXrpTokenValue({ value: recipientLine.balance, roundUp: true });

	if (amount > room) {
		return 'trust_line_limit';
	}
};
