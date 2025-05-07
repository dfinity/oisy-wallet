import type { CampaignEligibility, EligibilityReport } from '$declarations/rewards/rewards.did';
import { writable, type Readable } from 'svelte/store';

export type RewardEligibilityData = {
	eligibilityReport: EligibilityReport;
};

export interface RewardEligibilityStore extends Readable<RewardEligibilityData> {
	getCampaignEligibility: (campaignId: string) => CampaignEligibility | undefined;
}

export const initRewardEligibilityStore = (
	eligibilityReport: EligibilityReport
): RewardEligibilityStore => {
	const { subscribe, set } = writable<RewardEligibilityData>(undefined);

	set({ eligibilityReport });

	return {
		subscribe,

		getCampaignEligibility: (campaignId: string) => {
			const [_, campaignEligibility] =
				eligibilityReport.campaigns.find(([id, _]) => id === campaignId) ?? [];
			return campaignEligibility;
		}
	};
};

export interface RewardEligibilityContext {
	store: RewardEligibilityStore;
}

export const REWARD_ELIGIBILITY_CONTEXT_KEY = Symbol('reward-eligibility');
