import { render, screen } from '@testing-library/svelte';
import { readable, writable } from 'svelte/store';

import RewardsEarningOpportunityCard from '$lib/components/earning/RewardsEarningOpportunityCard.svelte';

import * as navModule from '$app/navigation';
import * as earningCardsEnv from '$env/earning-cards.env';
import * as rewardCampaignsEnv from '$env/reward-campaigns.env';
import * as formatUtils from '$lib/utils/format.utils';
import * as i18nUtils from '$lib/utils/i18n.utils';

import { AppPath } from '$lib/constants/routes.constants';
import { REWARD_ELIGIBILITY_CONTEXT_KEY } from '$lib/stores/reward.store';
import { mockRewardCampaigns } from '$tests/mocks/reward-campaigns.mock';

const mockRewardEligibilityStore = writable({
	campaignEligibilities: [
		{
			campaignId: 'sprinkles_s1e5',
			eligible: true,
			probabilityMultiplierEnabled: true,
			probabilityMultiplier: 1.2,
			criteria: ['criterion1']
		}
	]
});

const mockRewardEligibilityContext = {
	store: {
		subscribe: mockRewardEligibilityStore.subscribe,
		setCampaignEligibilities: vi.fn()
	},
	getCampaignEligibility: (id: string) =>
		readable({
			campaignId: id,
			eligible: true,
			probabilityMultiplierEnabled: true,
			probabilityMultiplier: 1.2,
			criteria: ['criterion1']
		})
};

const mockContext = new Map<symbol, unknown>([
	[REWARD_ELIGIBILITY_CONTEXT_KEY, mockRewardEligibilityContext]
]);

describe('RewardsEarningOpportunityCard', () => {
	beforeEach(() => {
		vi.restoreAllMocks();

		const currentReward = mockRewardCampaigns[mockRewardCampaigns.length - 1];

		vi.spyOn(rewardCampaignsEnv, 'rewardCampaigns', 'get').mockReturnValue(mockRewardCampaigns);

		vi.spyOn(earningCardsEnv, 'earningCards', 'get').mockReturnValue([
			{
				id: currentReward.id,
				title: 'mock.rewards.title',
				description: 'mock.rewards.description',
				logo: '/images/rewards/oisy-reward-logo.svg',
				fields: [],
				actionText: 'mock.rewards.action'
			}
		]);

		vi.spyOn(formatUtils, 'formatToShortDateString').mockReturnValue('Dec 31, 2024');

		vi.spyOn(i18nUtils, 'resolveText').mockImplementation(({ path }) => path);

		vi.spyOn(navModule, 'goto').mockResolvedValue();
	});

	it('renders the reward card title and description', () => {
		render(RewardsEarningOpportunityCard, { context: mockContext });

		expect(screen.getByText('mock.rewards.title')).toBeInTheDocument();
		expect(screen.getByText('mock.rewards.description')).toBeInTheDocument();
	});

	it('renders the formatted end date', () => {
		render(RewardsEarningOpportunityCard, { context: mockContext });
		expect(screen.getByText(/Dec 31, 2024/)).toBeInTheDocument();
	});

	it('renders the button with the correct text', () => {
		render(RewardsEarningOpportunityCard, { context: mockContext });

		const button = screen.getByRole('button', { name: 'mock.rewards.action' });
		expect(button).toBeInTheDocument();
	});

	it('navigates to the rewards page when the button is clicked', async () => {
		render(RewardsEarningOpportunityCard, { context: mockContext });

		const button = screen.getByRole('button', { name: 'mock.rewards.action' });
		await button.click();

		expect(navModule.goto).toHaveBeenCalledTimes(1);
		expect(navModule.goto).toHaveBeenCalledWith(AppPath.EarningRewards);
	});

	it('renders nothing if no matching earning card is found for the current reward', () => {
		// Make earningCards return an empty array
		vi.spyOn(earningCardsEnv, 'earningCards', 'get').mockReturnValue([]);

		const { container } = render(RewardsEarningOpportunityCard, { context: mockContext });
		expect(container.textContent?.trim()).toBe('');
	});
});
