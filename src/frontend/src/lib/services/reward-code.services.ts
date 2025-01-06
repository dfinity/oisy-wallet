import type { VipReward } from '$declarations/rewards/rewards.did';
import {
	claimVipReward as claimVipRewardApi,
	getNewVipReward as getNewVipRewardApi,
	getUserInfo as getUserInfoApi
} from '$lib/api/reward.api';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { ResultSuccess } from '$lib/types/utils';
import type { Identity } from '@dfinity/agent';
import { fromNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

const queryVipUser = async ({
	identity,
	certified
}: {
	identity: Identity;
	certified: boolean;
}): Promise<ResultSuccess> => {
	const userData = await getUserInfoApi({
		identity,
		certified,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	return { success: fromNullable(userData.is_vip) === true };
};

export const isVipUser = async ({ identity }: { identity: Identity }): Promise<ResultSuccess> => {
	try {
		return await queryVipUser({ identity, certified: false });
	} catch (err) {
		const { vip } = get(i18n);
		toastsError({
			msg: { text: vip.reward.error.loading_user_data },
			err
		});
	}
	return { success: false };
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
		throw new Error('User is not VIP');
	}
	throw new Error('Unknown error');
};

// The call to generate a new reward code will always be an update call and cannot be a query.
export const getNewReward = async (identity: Identity): Promise<VipReward | undefined> => {
	try {
		return await updateReward(identity);
	} catch (err) {
		const { vip } = get(i18n);
		toastsError({
			msg: { text: vip.reward.error.loading_reward },
			err
		});
	}
};

const updateVipReward = async ({
	identity,
	code
}: {
	identity: Identity;
	code: string;
}): Promise<ResultSuccess> => {
	const response = await claimVipRewardApi({
		identity,
		vipReward: { code },
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	if ('Success' in response) {
		return { success: true };
	}
	if ('InvalidCode' in response || 'AlreadyClaimed' in response) {
		return { success: false };
	}
	throw new Error('Unknown error');
};

// The call to claim a reward with a reward code will always be an update call and cannot be a query.
export const claimVipReward = async ({
	identity,
	code
}: {
	identity: Identity;
	code: string;
}): Promise<ResultSuccess> => {
	try {
		return await updateVipReward({
			identity,
			code
		});
	} catch (err) {
		const { vip } = get(i18n);
		toastsError({
			msg: { text: vip.reward.error.claiming_reward },
			err
		});
	}
	return { success: false };
};
