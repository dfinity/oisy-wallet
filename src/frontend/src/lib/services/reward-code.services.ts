import type { RewardInfo, VipReward } from '$declarations/rewards/rewards.did';
import type { IcToken } from '$icp/types/ic-token';
import {
	claimVipReward as claimVipRewardApi,
	getNewVipReward as getNewVipRewardApi,
	getUserInfo,
	getUserInfo as getUserInfoApi
} from '$lib/api/reward.api';
import { ZERO } from '$lib/constants/app.constants';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { AirdropInfo, AirdropsResponse } from '$lib/types/airdrop';
import { AlreadyClaimedError, InvalidCodeError, UserNotVipError } from '$lib/types/errors';
import type { OptionIdentity } from '$lib/types/identity';
import type { ResultSuccess } from '$lib/types/utils';
import type { Identity } from '@dfinity/agent';
import { fromNullable, nonNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';
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

const queryAirdrops = async (params: {
	identity: Identity;
	certified: boolean;
}): Promise<AirdropsResponse> => {
	const { usage_awards, last_snapshot_timestamp } = await getUserInfoApi({
		...params,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	const awards: RewardInfo[] | undefined = fromNullable(usage_awards);

	return {
		airdrops: nonNullish(awards) ? awards.map(mapRewardsInfo) : [],
		lastTimestamp: fromNullable(last_snapshot_timestamp) ?? 0n
	};
};

const mapRewardsInfo = ({ name, ...rest }: RewardInfo): AirdropInfo => ({
	...rest,
	name: fromNullable(name)
});

/**
 * Gets the airdrops the user received.
 *
 * This function performs **always** a query (not certified) to get the airdrops of a user.
 *
 * @async
 * @param {Object} params - The parameters required to load the user data.
 * @param {Identity} params.identity - The user's identity for authentication.
 * @returns {Promise<AirdropsResponse>} - Resolves with the received airdrops and the last timestamp of the user.
 *
 * @throws {Error} Displays an error toast and returns an empty list of airdrops if the query fails.
 */
export const getAirdrops = async (params: { identity: Identity }): Promise<AirdropsResponse> => {
	try {
		return await queryAirdrops({ ...params, certified: false });
	} catch (err: unknown) {
		const { vip } = get(i18n);
		toastsError({
			msg: { text: vip.reward.error.loading_user_data },
			err
		});
	}

	return { airdrops: [], lastTimestamp: 0n };
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
	const initialRewards = {
		ckBtcReward: ZERO,
		ckUsdcReward: ZERO,
		icpReward: ZERO
	};

	const rewards = data.usage_awards[0]?.reduce((acc, aw) => {
		if (nonNullish(aw)) {
			const canisterId = aw.ledger.toText();

			if (ckBtcToken.ledgerCanisterId === canisterId) {
				acc.ckBtcReward = BigNumber.from(acc.ckBtcReward).add(aw.amount);
			} else if (icpToken.ledgerCanisterId === canisterId) {
				acc.icpReward = BigNumber.from(acc.icpReward).add(aw.amount);
			} else if (ckUsdcToken.ledgerCanisterId === canisterId) {
				acc.ckUsdcReward = BigNumber.from(acc.ckUsdcReward).add(aw.amount);
			} else {
				console.warn(`Ledger canister mapping not found for: ${canisterId}`);
			}
		}
		return acc;
	}, initialRewards);

	return rewards ?? initialRewards;
};
