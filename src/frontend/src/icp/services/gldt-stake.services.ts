import type { StakePositionResponse } from '$declarations/gldt_stake/declarations/gldt_stake.did';
import { manageStakePosition } from '$icp/api/gldt_stake.api';
import { approve } from '$icp/api/icrc-ledger.api';
import type { IcToken } from '$icp/types/ic-token';
import { nowInBigIntNanoSeconds } from '$icp/utils/date.utils';
import { GLDT_STAKE_CANISTER_ID, NANO_SECONDS_IN_MINUTE } from '$lib/constants/app.constants';
import { ProgressStepsStake } from '$lib/enums/progress-steps';
import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';
import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

export const stakeGldt = async ({
	identity,
	amount,
	gldtToken,
	progress,
	stakeCompleted
}: {
	identity: Identity;
	gldtToken: IcToken;
	amount: bigint;
	stakeCompleted: () => void;
	progress?: (step: ProgressStepsStake) => void;
}): Promise<StakePositionResponse | undefined> => {
	progress?.(ProgressStepsStake.APPROVE);

	await approve({
		identity,
		ledgerCanisterId: gldtToken.ledgerCanisterId,
		// amount + "approve" and "transfer" fees
		amount: amount + gldtToken.fee * 2n,
		expiresAt: nowInBigIntNanoSeconds() + 5n * NANO_SECONDS_IN_MINUTE,
		spender: {
			owner: Principal.from(GLDT_STAKE_CANISTER_ID)
		}
	});

	progress?.(ProgressStepsStake.STAKE);

	const response = await manageStakePosition({
		identity,
		positionParams: { AddStake: { amount } }
	});

	stakeCompleted();

	progress?.(ProgressStepsStake.UPDATE_UI);

	await waitAndTriggerWallet();

	return response;
};
