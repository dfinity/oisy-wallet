import type { EligibilityReport } from '$declarations/rewards/rewards.did';
import { writable, type Readable } from 'svelte/store';

export type RewardEligibilityData = {
    eligibilityReport?: EligibilityReport | undefined;
};

export interface RewardEligibilityStore extends Readable<RewardEligibilityData> {
    setEligibilityReport: (eligibilityReport: EligibilityReport) => void;
}

export const initRewardEligibilityStore = (): RewardEligibilityStore => {
    const { subscribe, set } = writable<RewardEligibilityData>(undefined);

    return {
        subscribe,

        setEligibilityReport: (eligibilityReport: EligibilityReport) => {
            set({ eligibilityReport });
        }
    };
};

export interface RewardEligibilityContext {
    store: RewardEligibilityStore;
}

export const REWARD_ELIGIBILITY_CONTEXT_KEY = Symbol('reward-eligibility');