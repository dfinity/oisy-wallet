import { HERO_CONTEXT_KEY, initHeroContext } from '$lib/stores/hero.store';
import {
	initModalNetworksListContext,
	MODAL_NETWORKS_LIST_CONTEXT_KEY
} from '$lib/stores/modal-networks-list.store';
import {
	initModalTokensListContext,
	MODAL_TOKENS_LIST_CONTEXT_KEY
} from '$lib/stores/modal-tokens-list.store';
import { initPayContext, PAY_CONTEXT_KEY } from '$lib/stores/open-crypto-pay.store';
import {
	initRewardEligibilityContext,
	initRewardEligibilityStore,
	REWARD_ELIGIBILITY_CONTEXT_KEY,
	type RewardEligibilityStore
} from '$lib/stores/reward.store';
import type { MockContextEntry } from '$tests/utils/context.test-utils';

export const mockPayContextEntry = (): MockContextEntry => [PAY_CONTEXT_KEY, initPayContext()];

export const mockHeroContextEntry = (): MockContextEntry => [HERO_CONTEXT_KEY, initHeroContext()];

export const mockRewardEligibilityContextEntry = (
	store: RewardEligibilityStore = initRewardEligibilityStore()
): MockContextEntry => [REWARD_ELIGIBILITY_CONTEXT_KEY, initRewardEligibilityContext(store)];

export const mockModalTokensListContextEntry = (
	modalTokensListData: Parameters<typeof initModalTokensListContext>[0]
): MockContextEntry => [
	MODAL_TOKENS_LIST_CONTEXT_KEY,
	initModalTokensListContext(modalTokensListData)
];

export const mockModalNetworksListContextEntry = (
	initialData: Parameters<typeof initModalNetworksListContext>[0]
): MockContextEntry => [MODAL_NETWORKS_LIST_CONTEXT_KEY, initModalNetworksListContext(initialData)];
