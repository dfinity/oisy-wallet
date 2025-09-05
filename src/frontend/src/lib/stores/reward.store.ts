import type { CampaignEligibility } from '$lib/types/reward';
import { derived, writable, type Readable } from 'svelte/store';

export interface RewardEligibilityData {
	campaignEligibilities?: CampaignEligibility[] | undefined;
}

export interface RewardEligibilityStore extends Readable<RewardEligibilityData> {
	setCampaignEligibilities: (campaignEligibilities: CampaignEligibility[]) => void;
}

export const initRewardEligibilityStore = (): RewardEligibilityStore => {
	const { subscribe, set } = writable<RewardEligibilityData>({ campaignEligibilities: undefined });

	return {
		subscribe,

		setCampaignEligibilities: (campaignEligibilities: CampaignEligibility[]) => {
			set({ campaignEligibilities });
		}
	};
};

export interface RewardEligibilityContext {
	store: RewardEligibilityStore;
	getCampaignEligibility: (campaignId: string) => Readable<CampaignEligibility | undefined>;
}

export const initRewardEligibilityContext = (
	store: RewardEligibilityStore
): RewardEligibilityContext => ({
	store,
	getCampaignEligibility: (rewardId: string) =>
		derived(store, ($store) =>
			$store?.campaignEligibilities?.find(({ campaignId }) => campaignId === rewardId)
		)
});

export const REWARD_ELIGIBILITY_CONTEXT_KEY = Symbol('reward-eligibility');
