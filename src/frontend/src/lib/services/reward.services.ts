import type {
	ClaimedVipReward,
	EligibilityReport,
	ReferrerInfo,
	RewardInfo,
	SetReferrerResponse,
	VipReward
} from '$declarations/rewards/rewards.did';
import type { IcToken } from '$icp/types/ic-token';
import {
	claimVipReward as claimVipRewardApi,
	getNewVipReward as getNewVipRewardApi,
	getReferrerInfo as getReferrerInfoApi,
	getUserInfo,
	getUserInfo as getUserInfoApi,
	isEligible as isEligibleApi,
	setReferrer as setReferrerApi
} from '$lib/api/reward.api';
import { ZERO } from '$lib/constants/app.constants';
import { QrCodeType, asQrCodeType } from '$lib/enums/qr-code-types';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import {
	AlreadyClaimedError,
	InvalidCampaignError,
	InvalidCodeError,
	UserNotVipError
} from '$lib/types/errors';
import type {
	CampaignEligibility,
	RewardClaimApiResponse,
	RewardClaimResponse,
	RewardResponseInfo,
	RewardsResponse,
	UserRoleResult
} from '$lib/types/reward';
import type { ResultSuccess } from '$lib/types/utils';
import { mapEligibilityReport } from '$lib/utils/rewards.utils';
import type { Identity } from '@dfinity/agent';
import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

const queryEligibilityReport = async (params: {
	identity: Identity;
	certified: boolean;
}): Promise<EligibilityReport> =>
	await isEligibleApi({
		...params,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

export const getCampaignEligibilities = async (params: {
	identity: Identity;
}): Promise<CampaignEligibility[]> => {
	try {
		const eligibilityReport = await queryEligibilityReport({
			...params,
			certified: false
		});

		console.log(eligibilityReport);

		const wusch = mapEligibilityReport(eligibilityReport);

		console.log(wusch);

		return wusch;
	} catch (err: unknown) {
		const { vip } = get(i18n);
		toastsError({
			msg: { text: vip.reward.error.loading_eligibility },
			err
		});
		return [];
	}
};

const queryUserRoles = async (params: {
	identity: Identity;
	certified: boolean;
}): Promise<UserRoleResult> => {
	const userData = await getUserInfoApi({
		...params,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	const superpowers = fromNullable(userData.superpowers);
	if (isNullish(superpowers)) {
		return { isVip: false, isGold: false };
	}

	return {
		isVip: superpowers.includes(QrCodeType.VIP),
		isGold: superpowers.includes(QrCodeType.GOLD)
	};
};

/**
 * Gets the roles of a user.
 *
 * This function performs **always** a query (not certified) to determine the roles of a user.
 *
 * @async
 * @param {Object} params - The parameters required to check VIP status.
 * @param {Identity} params.identity - The user's identity for authentication.
 * @returns {Promise<UserRoleResult>} - Resolves with the result indicating the users roles.
 *
 * @throws {Error} Displays an error toast and logs the error if the query fails.
 */
export const getUserRoles = async (params: { identity: Identity }): Promise<UserRoleResult> => {
	try {
		return await queryUserRoles({ ...params, certified: false });
	} catch (err: unknown) {
		const { vip } = get(i18n);
		toastsError({
			msg: { text: vip.reward.error.loading_user_data },
			err
		});

		return { isVip: false, isGold: false };
	}
};

const queryRewards = async (params: {
	identity: Identity;
	certified: boolean;
}): Promise<RewardsResponse> => {
	const { usage_awards, last_snapshot_timestamp } = await getUserInfoApi({
		...params,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	const awards: RewardInfo[] | undefined = fromNullable(usage_awards);

	return {
		rewards: nonNullish(awards) ? awards.map(mapRewardsInfo) : [],
		lastTimestamp: fromNullable(last_snapshot_timestamp) ?? ZERO
	};
};

const mapRewardsInfo = ({
	name,
	campaign_name,
	campaign_id,
	...rest
}: RewardInfo): RewardResponseInfo => ({
	...rest,
	name: fromNullable(name),
	campaignName: fromNullable(campaign_name),
	campaignId: campaign_id
});

/**
 * Gets the rewards the user received.
 *
 * This function performs **always** a query (not certified) to get the rewards of a user.
 *
 * @async
 * @param {Object} params - The parameters required to load the user data.
 * @param {Identity} params.identity - The user's identity for authentication.
 * @returns {Promise<RewardsResponse>} - Resolves with the received rewards and the last timestamp of the user.
 *
 * @throws {Error} Displays an error toast and returns an empty list of rewards if the query fails.
 */
export const getRewards = async (params: { identity: Identity }): Promise<RewardsResponse> => {
	try {
		return await queryRewards({ ...params, certified: false });
	} catch (err: unknown) {
		const { vip } = get(i18n);
		toastsError({
			msg: { text: vip.reward.error.loading_user_data },
			err
		});
	}

	return { rewards: [], lastTimestamp: ZERO };
};

const updateReward = async ({
	rewardType,
	identity
}: {
	rewardType: ClaimedVipReward;
	identity: Identity;
}): Promise<VipReward> => {
	const response = await getNewVipRewardApi({
		rewardType,
		identity,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	if ('VipReward' in response) {
		return response.VipReward;
	}
	if ('NotImportantPerson' in response) {
		throw new UserNotVipError();
	}
	throw new Error('Unknown error');
};

/**
 * Generates a new VIP or Gold reward code.
 *
 * This function **always** makes an **update** call and cannot be a query.
 *
 * @async
 * @param {Identity} identity - The user's identity for authentication.
 * @param {string} campaignId - The campaign's id.
 * @returns {Promise<VipReward | undefined>} - Resolves with the generated VIP or Gold reward or `undefined` if the operation fails.
 *
 * @throws {Error} Displays an error toast and logs the error if the update call fails.
 */
export const getNewReward = async ({
	campaignId,
	identity
}: {
	campaignId: QrCodeType;
	identity: Identity;
}): Promise<VipReward | undefined> => {
	try {
		return await updateReward({ rewardType: { campaign_id: campaignId }, identity });
	} catch (err: unknown) {
		const { vip } = get(i18n);
		toastsError({
			msg: { text: vip.reward.error.loading_reward },
			err
		});
		return undefined;
	}
};

const updateVipReward = async ({
	identity,
	code
}: {
	identity: Identity;
	code: string;
}): Promise<string> => {
	const response: RewardClaimApiResponse = await claimVipRewardApi({
		identity,
		vipReward: { code },
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	if ('Success' in response.claimRewardResponse) {
		const { claimedVipReward } = response;
		if (isNullish(claimedVipReward)) {
			throw new InvalidCampaignError();
		}

		return claimedVipReward.campaign_id;
	}

	if ('InvalidCode' in response.claimRewardResponse) {
		throw new InvalidCodeError();
	}

	if ('AlreadyClaimed' in response.claimRewardResponse) {
		throw new AlreadyClaimedError();
	}

	throw new Error('Unknown error');
};

/**
 * Claims a VIP reward using a provided reward code.
 *
 * This function **always** makes an **update** call and cannot be a query.
 *
 * @async
 * @param {Object} params - The parameters required to claim the reward.
 * @param {Identity} params.identity - The user's identity for authentication.
 * @param {string} params.code - The reward code to claim the VIP reward.
 * @returns {Promise<RewardClaimResponse>} - Resolves with the result state and campaign id of the claim if successful.
 *
 * @throws {Error} Throws an error if the update call fails or the reward cannot be claimed.
 */
export const claimVipReward = async (params: {
	identity: Identity;
	code: string;
}): Promise<RewardClaimResponse> => {
	try {
		const campaignId = await updateVipReward(params);
		return { success: true, campaignId: asQrCodeType(campaignId) };
	} catch (err: unknown) {
		return { success: false, err };
	}
};

const queryReferrerInfo = async (params: {
	identity: Identity;
	certified: boolean;
}): Promise<ReferrerInfo> =>
	await getReferrerInfoApi({
		...params,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

/**
 * Gets the referrer info of the user.
 *
 * This function performs **always** a query (not certified) to get the referrer info of a user.
 *
 * @async
 * @param {Object} params - The parameters required to load the referrer info.
 * @param {Identity} params.identity - The user's identity for authentication.
 * @returns {Promise<ReferrerInfo>} - Resolves with the received referral code and the number of referrals.
 *
 * @throws {Error} Displays an error toast and returns undefined if the query fails.
 */
export const getReferrerInfo = async (params: {
	identity: Identity;
}): Promise<
	| {
			referralCode: number;
			numberOfReferrals: number;
	  }
	| undefined
> => {
	try {
		const referrerInfo = await queryReferrerInfo({ ...params, certified: false });

		return {
			referralCode: referrerInfo.referral_code,
			numberOfReferrals: fromNullable(referrerInfo.num_referrals) ?? 0
		};
	} catch (err: unknown) {
		const { referral } = get(i18n);
		toastsError({
			msg: { text: referral.invitation.error.loading_referrer_info },
			err
		});
	}
};

const updateReferrer = async ({
	identity,
	referrerCode
}: {
	identity: Identity;
	referrerCode: number;
}): Promise<SetReferrerResponse> =>
	await setReferrerApi({
		identity,
		referrerCode,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

/**
 * Establish a referral connection using a provided referral code.
 *
 * This function **always** makes an **update** call and cannot be a query.
 *
 * @async
 * @param {Object} params - The parameters required to establish the connection.
 * @param {Identity} params.identity - The user's identity for authentication.
 * @param {string} params.referrerCode - The referral code to establish the connection.
 * @returns {Promise<ResultSuccess>} - Resolves with the result if successful.
 *
 * @throws {Error} Throws an error if the update call fails or if the connection cannot be established.
 */
export const setReferrer = async (params: {
	identity: Identity;
	referrerCode: number;
}): Promise<ResultSuccess> => {
	try {
		await updateReferrer(params);
		return { success: true };
	} catch (err: unknown) {
		const { referral } = get(i18n);
		toastsError({
			msg: { text: referral.invitation.error.setting_referrer },
			err
		});
		return { success: false, err };
	}
};

export const getUserRewardsTokenAmounts = async ({
	ckBtcToken,
	ckUsdcToken,
	icpToken,
	identity,
	campaignId
}: {
	ckBtcToken: IcToken;
	ckUsdcToken: IcToken;
	icpToken: IcToken;
	identity: Identity;
	campaignId: string;
}): Promise<{
	ckBtcReward: bigint;
	ckUsdcReward: bigint;
	icpReward: bigint;
	amountOfRewards: number;
}> => {
	const initialRewards = {
		ckBtcReward: ZERO,
		ckUsdcReward: ZERO,
		icpReward: ZERO,
		amountOfRewards: 0
	};

	const { usage_awards } = await getUserInfo({ identity });
	const usageAwards = fromNullable(usage_awards);

	if (isNullish(usageAwards)) {
		return initialRewards;
	}

	const filteredUsageAwards = usageAwards.filter(({ campaign_id }) => campaign_id === campaignId);

	return filteredUsageAwards.reduce((acc, { ledger, amount }) => {
		const canisterId = ledger.toText();

		return ckBtcToken.ledgerCanisterId === canisterId
			? {
					...acc,
					ckBtcReward: acc.ckBtcReward + amount,
					amountOfRewards: acc.amountOfRewards + 1
				}
			: icpToken.ledgerCanisterId === canisterId
				? { ...acc, icpReward: acc.icpReward + amount, amountOfRewards: acc.amountOfRewards + 1 }
				: ckUsdcToken.ledgerCanisterId === canisterId
					? {
							...acc,
							ckUsdcReward: acc.ckUsdcReward + amount,
							amountOfRewards: acc.amountOfRewards + 1
						}
					: acc;
	}, initialRewards);
};
