import { ZERO } from '$lib/constants/app.constants';
import type { Address } from '$lib/types/address';
import { isNullishOrEmpty } from '$lib/utils/input.utils';
import { XRP_BASE_RESERVE_DROPS, XRP_OWNER_RESERVE_DROPS } from '$xrp/constants/xrp.constants';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import { invalidXrpAddress } from '$xrp/utils/xrp-address.utils';

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
