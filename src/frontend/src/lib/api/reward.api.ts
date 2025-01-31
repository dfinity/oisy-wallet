import type {
	ClaimVipRewardResponse,
	NewVipRewardResponse,
	UserData,
	VipReward
} from '$declarations/rewards/rewards.did';
import { RewardCanister } from '$lib/canisters/reward.canister';
import { REWARDS_CANISTER_ID } from '$lib/constants/app.constants';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, isNullish, type QueryParams } from '@dfinity/utils';

let canister: RewardCanister | undefined = undefined;

export const getUserInfo = async ({
	identity,
	certified
}: CanisterApiFunctionParams<QueryParams>): Promise<UserData> => {
	const { getUserInfo } = await rewardCanister({ identity });

	return getUserInfo({ certified });
};

export const getNewVipReward = async ({
	identity
}: CanisterApiFunctionParams): Promise<NewVipRewardResponse> => {
	const { getNewVipReward } = await rewardCanister({ identity });

	return getNewVipReward();
};

export const claimVipReward = async ({
	vipReward,
	identity
}: CanisterApiFunctionParams<{
	vipReward: VipReward;
}>): Promise<ClaimVipRewardResponse> => {
	const { claimVipReward } = await rewardCanister({ identity });

	return claimVipReward(vipReward);
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
