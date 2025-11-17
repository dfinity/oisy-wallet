import type {
	StakePositionResponse,
	TokenSymbol
} from '$declarations/gldt_stake/declarations/gldt_stake.did';
import { manageStakePosition } from '$icp/api/gldt_stake.api';
import { approve } from '$icp/api/icrc-ledger.api';
import { loadCustomTokens } from '$icp/services/icrc.services';
import type { IcToken } from '$icp/types/ic-token';
import { nowInBigIntNanoSeconds } from '$icp/utils/date.utils';
import { setCustomToken } from '$lib/api/backend.api';
import { GLDT_STAKE_CANISTER_ID, NANO_SECONDS_IN_MINUTE } from '$lib/constants/app.constants';
import {
	ProgressStepsClaimStakingReward,
	ProgressStepsStake,
	ProgressStepsUnstake
} from '$lib/enums/progress-steps';
import { i18n } from '$lib/stores/i18n.store';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';
import type { Identity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { get } from 'svelte/store';

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

export const claimGldtStakingReward = async ({
	identity,
	token,
	isTokenDisabled,
	progress,
	claimStakingRewardCompleted
}: {
	identity: Identity;
	token: IcToken;
	isTokenDisabled: boolean;
	claimStakingRewardCompleted: () => void;
	progress?: (step: ProgressStepsClaimStakingReward) => void;
}): Promise<StakePositionResponse | undefined> => {
	progress?.(ProgressStepsClaimStakingReward.CLAIM);

	const response = await manageStakePosition({
		identity,
		positionParams: { ClaimRewards: { tokens: [{ [token.symbol]: null } as TokenSymbol] } }
	});

	claimStakingRewardCompleted();

	progress?.(ProgressStepsClaimStakingReward.UPDATE_UI);

	if (isTokenDisabled) {
		await setCustomToken({
			token: toCustomToken({ ...token, enabled: true, networkKey: 'Icrc' }),
			identity,
			nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
		});
		await loadCustomTokens({ identity });
	}

	await waitAndTriggerWallet();

	return response;
};
