import { ZERO } from '$lib/constants/app.constants';
import type { Address } from '$lib/types/address';
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

export const isInvalidDestinationXrp = (destination: Address | undefined): boolean =>
	invalidXrpAddress(destination);
