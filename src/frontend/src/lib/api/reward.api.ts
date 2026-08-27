import type {
	CancelQrGiftCodeResponse,
	ClaimedVipReward,
	CreateQrGiftCodeRequest,
	CreateQrGiftCodeResponse,
	EligibilityReport,
	NewVipRewardResponse,
	QrGiftCodeEntry,
	QrGiftCodeInfoResponse,
	RedeemQrGiftCodeRequest,
	RedeemQrGiftCodeResponse,
	ReferrerInfo,
	SetReferrerResponse,
	UserData,
	UserSnapshot,
	VipReward
} from '$declarations/rewards/rewards.did';
import { CanisterApi } from '$lib/api/canister.api';
import { RewardCanister } from '$lib/canisters/reward.canister';
import { REWARDS_CANISTER_ID } from '$lib/constants/app.constants';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import type { RewardClaimApiResponse } from '$lib/types/reward';
import { assertNonNullish, type QueryParams } from '@dfinity/utils';

const rewardApi = new CanisterApi<RewardCanister>();

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

export const createQrGiftCode = async ({
	request,
	identity
}: CanisterApiFunctionParams<{
	request: CreateQrGiftCodeRequest;
}>): Promise<CreateQrGiftCodeResponse> => {
	const { createQrGiftCode } = await rewardCanister({ identity });

	return createQrGiftCode(request);
};

export const redeemQrGiftCode = async ({
	request,
	identity
}: CanisterApiFunctionParams<{
	request: RedeemQrGiftCodeRequest;
}>): Promise<RedeemQrGiftCodeResponse> => {
	const { redeemQrGiftCode } = await rewardCanister({ identity });

	return redeemQrGiftCode(request);
};

export const cancelQrGiftCode = async ({
	code,
	identity
}: CanisterApiFunctionParams<{
	code: string;
}>): Promise<CancelQrGiftCodeResponse> => {
	const { cancelQrGiftCode } = await rewardCanister({ identity });

	return cancelQrGiftCode(code);
};

export const getQrGiftCodeInfo = async ({
	code,
	identity,
	certified
}: CanisterApiFunctionParams<{ code: string } & QueryParams>): Promise<
	QrGiftCodeInfoResponse | undefined
> => {
	const { getQrGiftCodeInfo } = await rewardCanister({ identity });

	return getQrGiftCodeInfo({ certified, code });
};

export const getMyQrGiftCodes = async ({
	identity,
	certified
}: CanisterApiFunctionParams<QueryParams>): Promise<QrGiftCodeEntry[]> => {
	const { getMyQrGiftCodes } = await rewardCanister({ identity });

	return getMyQrGiftCodes({ certified });
};

const rewardCanister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId = REWARDS_CANISTER_ID
}: CanisterApiFunctionParams): Promise<RewardCanister> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	return await rewardApi.getCanister({
		identity,
		canisterId,
		create: RewardCanister.create
	});
};
