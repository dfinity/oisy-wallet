import type { ReferrerInfo, RewardInfo, VipReward } from '$declarations/rewards/rewards.did';
import type { IcToken } from '$icp/types/ic-token';
import {
	claimVipReward as claimVipRewardApi,
	getNewVipReward as getNewVipRewardApi,
	getReferrerInfo as getReferrerInfoApi,
	getUserInfo,
	getUserInfo as getUserInfoApi,
	setReferrer as setReferrerApi
} from '$lib/api/reward.api';
import { MILLISECONDS_IN_DAY, ZERO_BI } from '$lib/constants/app.constants';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import { AlreadyClaimedError, InvalidCodeError, UserNotVipError } from '$lib/types/errors';
import type { RewardResponseInfo, RewardsResponse } from '$lib/types/reward';
import type { AnyTransactionUiWithCmp } from '$lib/types/transaction';
import type { ResultSuccess } from '$lib/types/utils';
import { formatNanosecondsToTimestamp } from '$lib/utils/format.utils';
import type { Identity } from '@dfinity/agent';
import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

const queryVipUser = async (params: {
	identity: Identity;
	certified: boolean;
}): Promise<ResultSuccess> => {
	const userData = await getUserInfoApi({
		...params,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	return { success: fromNullable(userData.is_vip) === true };
};

/**
 * Checks if a user is a VIP user.
 *
 * This function performs **always** a query (not certified) to determine the VIP status of a user.
 *
 * @async
 * @param {Object} params - The parameters required to check VIP status.
 * @param {Identity} params.identity - The user's identity for authentication.
 * @returns {Promise<ResultSuccess>} - Resolves with the result indicating if the user is a VIP.
 *
 * @throws {Error} Displays an error toast and logs the error if the query fails.
 */
export const isVipUser = async (params: { identity: Identity }): Promise<ResultSuccess> => {
	try {
		return await queryVipUser({ ...params, certified: false });
	} catch (err: unknown) {
		const { vip } = get(i18n);
		toastsError({
			msg: { text: vip.reward.error.loading_user_data },
			err
		});

		return { success: false, err };
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
		lastTimestamp: fromNullable(last_snapshot_timestamp) ?? ZERO_BI
	};
};

const mapRewardsInfo = ({ name, ...rest }: RewardInfo): RewardResponseInfo => ({
	...rest,
	name: fromNullable(name)
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

	return { rewards: [], lastTimestamp: ZERO_BI };
};

const updateReward = async (identity: Identity): Promise<VipReward> => {
	const response = await getNewVipRewardApi({
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
 * Generates a new VIP reward code.
 *
 * This function **always** makes an **update** call and cannot be a query.
 *
 * @async
 * @param {Identity} identity - The user's identity for authentication.
 * @returns {Promise<VipReward | undefined>} - Resolves with the generated VIP reward or `undefined` if the operation fails.
 *
 * @throws {Error} Displays an error toast and logs the error if the update call fails.
 */
export const getNewReward = async (identity: Identity): Promise<VipReward | undefined> => {
	try {
		return await updateReward(identity);
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
}): Promise<void> => {
	const response = await claimVipRewardApi({
		identity,
		vipReward: { code },
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	if ('Success' in response) {
		return;
	}

	if ('InvalidCode' in response) {
		throw new InvalidCodeError();
	}

	if ('AlreadyClaimed' in response) {
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
 * @returns {Promise<ResultSuccess>} - Resolves with the result of the claim if successful.
 *
 * @throws {Error} Throws an error if the update call fails or the reward cannot be claimed.
 */
export const claimVipReward = async (params: {
	identity: Identity;
	code: string;
}): Promise<ResultSuccess> => {
	try {
		await updateVipReward(params);
		return { success: true };
	} catch (err: unknown) {
		const { vip } = get(i18n);
		toastsError({
			msg: { text: vip.reward.error.claiming_reward },
			err
		});
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
}): Promise<void> =>
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

// Todo: for the moment we evaluate if requirements are fulfilled in frontend
// this will change once we get this info from rewards canister
export const getRewardRequirementsFulfilled = ({
	transactions,
	totalUsdBalance
}: {
	transactions: AnyTransactionUiWithCmp[];
	totalUsdBalance: number;
}): boolean[] => {
	const req1 = true; // logged in once in last 7 days
	const req2: boolean =
		transactions.filter((trx) =>
			trx.transaction.timestamp
				? new Date().getTime() - MILLISECONDS_IN_DAY * 7 <
					formatNanosecondsToTimestamp(BigInt(trx.transaction.timestamp))
				: false
		).length >= 2; // at least 2 transactions in last 7 days
	const req3: boolean = totalUsdBalance >= 20; // at least 20$ balance

	return [req1, req2, req3];
};

export const getUserRewardsTokenAmounts = async ({
	ckBtcToken,
	ckUsdcToken,
	icpToken,
	identity
}: {
	ckBtcToken: IcToken;
	ckUsdcToken: IcToken;
	icpToken: IcToken;
	identity: Identity;
}): Promise<{
	ckBtcReward: bigint;
	ckUsdcReward: bigint;
	icpReward: bigint;
	amountOfRewards: number;
}> => {
	const initialRewards = {
		ckBtcReward: ZERO_BI,
		ckUsdcReward: ZERO_BI,
		icpReward: ZERO_BI,
		amountOfRewards: 0
	};

	const { usage_awards } = await getUserInfo({ identity });
	const usageAwards = fromNullable(usage_awards);

	if (isNullish(usageAwards)) {
		return initialRewards;
	}

	return usageAwards.reduce((acc, { ledger, amount }) => {
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
