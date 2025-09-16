import { initRewardEligibilityStore } from '$lib/stores/reward.store';
import type { CampaignEligibility } from '$lib/types/reward';
import { mockCampaignEligibilities } from '$tests/mocks/reward-eligibility-report.mock';
import { get } from 'svelte/store';

describe('rewardStore', () => {
	it('should initialize with undefined campaign eligibilities', () => {
		const store = initRewardEligibilityStore();

		expect(get(store).campaignEligibilities).toBeUndefined();
	});

	it('should set campaign eligibilities', () => {
		const store = initRewardEligibilityStore();

		store.setCampaignEligibilities(mockCampaignEligibilities);

		expect(get(store).campaignEligibilities).toEqual(mockCampaignEligibilities);
	});

	it('should override previous campaign eligibilities when setting new ones', () => {
		const store = initRewardEligibilityStore();

		const newEligibilities: CampaignEligibility[] = [
			{
				campaignId: 'campaign-2',
				available: false,
				eligible: false,
				criteria: [],
				probabilityMultiplier: 1,
				probabilityActive: false
			}
		];

		store.setCampaignEligibilities(mockCampaignEligibilities);
		store.setCampaignEligibilities(newEligibilities);

		expect(get(store).campaignEligibilities).toEqual(newEligibilities);
		expect(get(store).campaignEligibilities).not.toEqual(mockCampaignEligibilities);
	});
});
