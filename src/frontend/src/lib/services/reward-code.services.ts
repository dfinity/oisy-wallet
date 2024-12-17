import type { Identity } from '@dfinity/agent';
import { getRewardCode as getRewardCodeApi } from '$lib/api/reward.api';
import { useRewardCode as useRewardCodeApi } from '$lib/api/reward.api';
import { get } from 'svelte/store';
import { i18n } from '$lib/stores/i18n.store';

export const getRewardCode = async (identity: Identity) => {
	return await getRewardCodeApi({identity, nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity});
}

export const useRewardCode = async (identity: Identity, code: string) => {
	return await useRewardCodeApi({ identity, code, nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity });
}