import RewardsEligibilityContext from '$lib/components/rewards/RewardsEligibilityContext.svelte';
import * as authServices from '$lib/services/auth.services';
import * as rewardServices from '$lib/services/reward.services';
import * as rewardStore from '$lib/stores/reward.store';
import type { CampaignEligibility } from '$lib/types/reward';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { render } from '@testing-library/svelte';

describe('RewardsEligibilityContext', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should call nullishSignOut when authIdentity is not set', () => {
		const signOutSpy = vi.spyOn(authServices, 'nullishSignOut').mockResolvedValue();

		render(RewardsEligibilityContext);

		expect(signOutSpy).toHaveBeenCalled();
	});

	it('should initialize reward store while rendering component', () => {
		mockAuthStore();

		const campaignEligibilities: CampaignEligibility[] = [
			{
				campaignId: 'test',
				eligible: true,
				available: true,
				criteria: [],
				probabilityMultiplierEnabled: false,
				probabilityMultiplier: 1
			}
		];
		const getCampaignEligibilitiesSpy = vi
			.spyOn(rewardServices, 'getCampaignEligibilities')
			.mockResolvedValueOnce(campaignEligibilities);
		const initStoreSpy = vi.spyOn(rewardStore, 'initRewardEligibilityStore');

		render(RewardsEligibilityContext);

		expect(getCampaignEligibilitiesSpy).toHaveBeenCalledOnce();
		expect(initStoreSpy).toHaveBeenCalledOnce();
	});
});
