import type {
	ClaimedVipReward,
	EligibilityReport,
	NewVipRewardResponse,
	ReferrerInfo,
	SetReferrerResponse,
	UserData,
	UserSnapshot,
	VipReward
} from '$declarations/rewards/rewards.did';
import { RewardCanister } from '$lib/canisters/reward.canister';
import { REWARDS_CANISTER_ID } from '$lib/constants/app.constants';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import type { RewardClaimApiResponse } from '$lib/types/reward';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, isNullish, type QueryParams } from '@dfinity/utils';

let canister: RewardCanister | undefined = undefined;

export const isEligible = async ({
	identity,
	certified
}: CanisterApiFunctionParams<QueryParams>): Promise<EligibilityReport> => {
	const { isEligible } = await rewardCanister({ identity });

	return isEligible({ certified });
};

export const getUserInfo = async ({
	identity,
	certified
}: CanisterApiFunctionParams<QueryParams>): Promise<UserData> => {
	const { getUserInfo } = await rewardCanister({ identity });

	return getUserInfo({ certified });
};

export const getNewVipReward = async ({
	rewardType,
	identity
}: CanisterApiFunctionParams<{
	rewardType: ClaimedVipReward;
}>): Promise<NewVipRewardResponse> => {
	const { getNewVipReward } = await rewardCanister({ identity });

	return getNewVipReward(rewardType);
};

export const claimVipReward = async ({
	vipReward,
	identity
}: CanisterApiFunctionParams<{
	vipReward: VipReward;
}>): Promise<RewardClaimApiResponse> => {
	const { claimVipReward } = await rewardCanister({ identity });

	return claimVipReward(vipReward);
};

export const getReferrerInfo = async ({
	identity,
	certified
}: CanisterApiFunctionParams<QueryParams>): Promise<ReferrerInfo> => {
	const { getReferrerInfo } = await rewardCanister({ identity });

	return getReferrerInfo({ certified });
};

export const setReferrer = async ({
	referrerCode,
	identity
}: CanisterApiFunctionParams<{
	referrerCode: number;
}>): Promise<SetReferrerResponse> => {
	const { setReferrer } = await rewardCanister({ identity });

	return setReferrer(referrerCode);
};

export const registerAirdropRecipient = async ({
	userSnapshot,
	identity
}: CanisterApiFunctionParams<{
	userSnapshot: UserSnapshot;
}>): Promise<void> => {
	const { registerAirdropRecipient } = await rewardCanister({ identity });

	return registerAirdropRecipient(userSnapshot);
};

const rewardCanister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId = REWARDS_CANISTER_ID
}: CanisterApiFunctionParams): Promise<RewardCanister> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	if (isNullish(canister)) {
		canister = await RewardCanister.create({
			identity,
			canisterId: Principal.fromText(canisterId)
		});
	}

	return canister;
};
