import type { VipReward } from '$declarations/rewards/rewards.did';
import {
	claimVipReward as claimVipRewardApi,
	getNewVipReward as getNewVipRewardApi,
	getUserInfo as getUserInfoApi
} from '$lib/api/reward.api';
import { i18n } from '$lib/stores/i18n.store';
import type { Identity } from '@dfinity/agent';
import { get } from 'svelte/store';
import { fromNullable } from '@dfinity/utils';

export const getVipStatus = async ({
	identity,
	certified
}: {
	identity: Identity;
	certified: boolean;
}): Promise<boolean> => {
	const userData = await getUserInfoApi({
		identity,
		certified,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	return fromNullable(userData.is_vip) === true;
};

export const getNewReward = async (identity: Identity): Promise<VipReward> => {
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

export const claimVipReward = async ({
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
	if ('InvalidCode' in response) {
		return false;
	}
	if ('AlreadyClaimed' in response) {
		return false;
	}
	throw new Error('Unknown error');
};
