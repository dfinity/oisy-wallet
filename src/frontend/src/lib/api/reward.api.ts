import type {
	ClaimVipRewardResponse,
	NewVipRewardResponse,
	UserData,
	UserSnapshot,
	VipReward
} from '$declarations/rewards/rewards.did';
import type { IcToken } from '$icp/types/ic-token';
import { RewardCanister } from '$lib/canisters/reward.canister';
import { REWARDS_CANISTER_ID, ZERO } from '$lib/constants/app.constants';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, isNullish, nonNullish, type QueryParams } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';

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

export const getUserRewardsTokenAmounts = async ({
	ckBtcToken,
	ckUsdcToken,
	icpToken,
	$authIdentity
}: {
	ckBtcToken: IcToken;
	ckUsdcToken: IcToken;
	icpToken: IcToken;
	$authIdentity: OptionIdentity;
}): Promise<{
	ckBtcReward: BigNumber;
	ckUsdcReward: BigNumber;
	icpReward: BigNumber;
}> => {
	const data = await getUserInfo({ identity: $authIdentity });
	/*
		const data = {
			usage_awards: [
				[{ ledger: { toText: () => ckBtcToken.ledgerCanisterId }, amount: 1000n }],
				[{ ledger: { toText: () => ckUsdcToken.ledgerCanisterId }, amount: 1000n }],
				[{ ledger: { toText: () => icpToken.ledgerCanisterId }, amount: 1000n }]
			]
		};
*/
	let _ckBtcReward: BigNumber = ZERO;
	let _ckUsdcReward: BigNumber = ZERO;
	let _icpReward: BigNumber = ZERO;

	for (let i = 0; i < (data.usage_awards[0] ?? []).length; i++) {
		const aw = data.usage_awards[0]?.[i];
		if (nonNullish(aw)) {
			const canisterId = aw.ledger.toText();
			if (ckBtcToken.ledgerCanisterId === canisterId) {
				_ckBtcReward = BigNumber.from(_ckBtcReward).add(aw.amount);
			} else if (icpToken.ledgerCanisterId === canisterId) {
				_icpReward = BigNumber.from(_icpReward).add(aw.amount);
			} else if (ckUsdcToken.ledgerCanisterId === canisterId) {
				_ckUsdcReward = BigNumber.from(_ckUsdcReward).add(aw.amount);
			} else {
				console.warn(`Ledger canister mapping not found for: ${canisterId}`);
			}
		}
	}

	return {
		ckBtcReward: _ckBtcReward,
		ckUsdcReward: _ckUsdcReward,
		icpReward: _icpReward
	};
};
