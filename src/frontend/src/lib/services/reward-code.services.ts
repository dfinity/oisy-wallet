import type { VipReward } from '$declarations/rewards/rewards.did';
import {
	claimVipReward as claimVipRewardApi,
	getNewVipReward as getNewVipRewardApi,
	getUserInfo as getUserInfoApi
} from '$lib/api/reward.api';
import { LOCAL } from '$lib/constants/app.constants';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import { AlreadyClaimedError, InvalidCodeError, UserNotVipError } from '$lib/types/errors';
import type { ResultSuccess } from '$lib/types/utils';
import type { Identity } from '@dfinity/agent';
import { fromNullable } from '@dfinity/utils';
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
		// TODO Remove this temporary fix as soon as we do run the rewards canister locally
		if (LOCAL) {
			console.error(vip.reward.error.loading_user_data, err);
		} else {
			toastsError({
				msg: { text: vip.reward.error.loading_user_data },
				err
			});
		}

		return { success: false, err };
	}
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
	}

	// TODO: should return a ResultSuccess
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
