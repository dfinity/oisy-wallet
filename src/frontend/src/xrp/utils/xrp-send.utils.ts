import { ZERO } from '$lib/constants/app.constants';
import type { Address } from '$lib/types/address';
import { XRP_BASE_RESERVE_DROPS } from '$xrp/constants/xrp.constants';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import { invalidXrpAddress } from '$xrp/utils/xrp-address.utils';

/**
 * Maximum sendable XRP in drops: the balance minus the transaction fee and the account
 * base reserve the ledger requires the account to retain. Never negative.
 */
export const getXrpMaxAmount = ({
	balance,
	fee
}: {
	balance: XrpBalance;
	fee: XrpBalance;
}): XrpBalance => {
	const max = balance - fee - XRP_BASE_RESERVE_DROPS;

	return max > ZERO ? max : ZERO;
};

export const isInvalidDestinationXrp = (destination: Address | undefined): boolean =>
	invalidXrpAddress(destination);
