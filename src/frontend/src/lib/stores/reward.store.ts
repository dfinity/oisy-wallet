import type { CampaignEligibility } from '$lib/types/reward';
import { writable, type Readable } from 'svelte/store';

export type RewardEligibilityData = {
	campaignEligibilities?: CampaignEligibility[] | undefined;
};

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
}

export const REWARD_ELIGIBILITY_CONTEXT_KEY = Symbol('reward-eligibility');
