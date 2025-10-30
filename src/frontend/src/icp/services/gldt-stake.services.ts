import type { StakePositionResponse } from '$declarations/gldt_stake/declarations/gldt_stake.did';
import { manageStakePosition } from '$icp/api/gldt_stake.api';
import { approve } from '$icp/api/icrc-ledger.api';
import type { IcToken } from '$icp/types/ic-token';
import { nowInBigIntNanoSeconds } from '$icp/utils/date.utils';
import { GLDT_STAKE_CANISTER_ID, NANO_SECONDS_IN_MINUTE } from '$lib/constants/app.constants';
import { ProgressStepsStake, ProgressStepsUnstake } from '$lib/enums/progress-steps';
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
		positionParams: { AddStake: { amount: amount + gldtToken.fee } }
	});

	stakeCompleted();

	progress?.(ProgressStepsStake.UPDATE_UI);

	await waitAndTriggerWallet();

	return response;
};

export const unstakeGldt = async ({
	identity,
	amount,
	progress,
	dissolveInstantly,
	totalStakedAmount,
	unstakeCompleted
}: {
	identity: Identity;
	amount: bigint;
	dissolveInstantly: boolean;
	totalStakedAmount: bigint;
	unstakeCompleted: () => void;
	progress?: (step: ProgressStepsUnstake) => void;
}): Promise<StakePositionResponse | undefined> => {
	progress?.(ProgressStepsUnstake.UNSTAKE);

	// TODO: replace "fraction" with "amount" when the gldt_stake canister allows that
	const fraction = Math.round(Number((amount * 100n) / totalStakedAmount));
	const response = await manageStakePosition({
		identity,
		positionParams: dissolveInstantly
			? { DissolveInstantly: { fraction } }
			: { StartDissolving: { fraction } }
	});

	unstakeCompleted();

	progress?.(ProgressStepsUnstake.UPDATE_UI);

	await waitAndTriggerWallet();

	return response;
};
