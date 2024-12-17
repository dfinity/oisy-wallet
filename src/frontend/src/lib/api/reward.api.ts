import { RewardCanister } from '$lib/canisters/reward.canister';
import { BACKEND_CANISTER_ID } from '$lib/constants/app.constants';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, isNullish } from '@dfinity/utils';

let canister: RewardCanister | undefined = undefined;

export const getRewardCode = async ({
	identity
}: CanisterApiFunctionParams<{}>): Promise<string> => {
	const { getRewardCode } = await rewardCanister({ identity });

	return getRewardCode();
};

export const useRewardCode = async ({
	code,
	identity
}: CanisterApiFunctionParams<{
	code: string;
}>): Promise<boolean> => {
	const { useRewardCode } = await rewardCanister({ identity });

	return useRewardCode(code);
};

const rewardCanister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId = BACKEND_CANISTER_ID // TODO replace with REWARD_CANISTER_ID
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
