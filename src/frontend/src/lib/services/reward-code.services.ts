import {
	getRewardCode as getRewardCodeApi,
	useRewardCode as useRewardCodeApi,
	isVip as isVipApi
} from '$lib/api/reward.api';
import { i18n } from '$lib/stores/i18n.store';
import type { Identity } from '@dfinity/agent';
import { get } from 'svelte/store';

export const isVip = async (identity: Identity) => {
	return await isVipApi({
		identity,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});
}

export const getRewardCode = async (identity: Identity) => {
	return await getRewardCodeApi({
		identity,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});
};

export const useRewardCode = async (identity: Identity, code: string) => {
	return await useRewardCodeApi({
		identity,
		code,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});
};
