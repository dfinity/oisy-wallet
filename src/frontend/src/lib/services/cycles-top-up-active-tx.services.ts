import type { CyclesTopUpData } from '$declarations/backend/backend.did';
import { CMC_TOP_UP_MEMO } from '$icp/constants/cmc.constants';
import { findCmcDeposit } from '$icp/services/cmc.services';
import { getCmcDepositAccountIdentifier } from '$icp/utils/cmc.utils';
import type { Identity } from '@icp-sdk/core/agent';

/**
 * Finds a top-up's deposit in the history of the CMC's deposit account for the canister.
 * Unlike a mint's, that account is shared by everyone who tops the canister up through the
 * CMC, so the search runs over all of the canister's deposits since the transfer; only the
 * caller's own transfer matches every field. See `findCmcDeposit`.
 */
export const findCyclesTopUpDeposit = ({
	identity,
	data: { canister_id, amount, transfer_created_at_ns }
}: {
	identity: Identity;
	data: CyclesTopUpData;
}): Promise<bigint | undefined> =>
	findCmcDeposit({
		identity,
		depositAccountIdentifier: getCmcDepositAccountIdentifier(canister_id),
		memo: CMC_TOP_UP_MEMO,
		amount,
		transferCreatedAtNs: transfer_created_at_ns
	});
