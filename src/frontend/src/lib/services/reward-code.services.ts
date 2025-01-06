import type { VipReward } from '$declarations/rewards/rewards.did';
import {
	claimVipReward as claimVipRewardApi,
	getNewVipReward as getNewVipRewardApi,
	getUserInfo as getUserInfoApi
} from '$lib/api/reward.api';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { Identity } from '@dfinity/agent';
import { fromNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

const queryVipUser = async ({
	identity,
	certified
}: {
	identity: Identity;
	certified: boolean;
}): Promise<boolean | undefined> => {
	const userData = await getUserInfoApi({
		identity,
		certified,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	return fromNullable(userData.is_vip) === true;
};

export const isVipUser = async ({
	identity
}: {
	identity: Identity;
}): Promise<boolean | undefined> => {
	try {
		return await queryVipUser({ identity, certified: false });
	} catch (err) {
		const { vip } = get(i18n);
		console.log(vip.reward.error.loading_user_data, err);
	}
};

const queryReward = async (identity: Identity): Promise<VipReward> => {
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

export const getNewReward = async (identity: Identity): Promise<VipReward | undefined> => {
	try {
		return await queryReward(identity);
	} catch (err) {
		const { vip } = get(i18n);
		toastsError({
			msg: { text: vip.reward.error.loading_reward },
			err
		});
	}
};

const queryVipReward = async ({
	identity,
	code
}: {
	identity: Identity;
	code: string;
}): Promise<boolean> => {
	const response = await claimVipRewardApi({
		identity,
		vipReward: { code },
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	if ('Success' in response) {
		return true;
	}
	if ('InvalidCode' in response || 'AlreadyClaimed' in response) {
		return false;
	}
	throw new Error('Unknown error');
};

export const claimVipReward = async ({
	identity,
	code
}: {
	identity: Identity;
	code: string;
}): Promise<boolean | undefined> => {
	try {
		return await queryVipReward({
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
};
