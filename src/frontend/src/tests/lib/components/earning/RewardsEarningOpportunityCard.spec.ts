import * as navModule from '$app/navigation';
import * as rewardCampaignsEnv from '$env/reward-campaigns.env';
import type { RewardCampaignDescription } from '$env/types/env-reward';
import RewardsEarningOpportunityCard from '$lib/components/earning/RewardsEarningOpportunityCard.svelte';
import { AppPath } from '$lib/constants/routes.constants';
import { REWARD_ELIGIBILITY_CONTEXT_KEY } from '$lib/stores/reward.store';
import type { EarningProviderCardConfig } from '$lib/types/earning-provider';
import * as formatUtils from '$lib/utils/format.utils';
import { mockRewardCampaigns } from '$tests/mocks/reward-campaigns.mock';
import { render, screen } from '@testing-library/svelte';
import { readable, writable } from 'svelte/store';

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

const mockCard: EarningProviderCardConfig = {
	id: 'sprinkles_s1e6',
	titles: ['mock.rewards.title'],
	description: 'mock.rewards.description',
	logo: '/images/rewards/oisy-reward-logo.svg',
	fields: [],
	actionText: 'mock.rewards.action'
};

describe('RewardsEarningOpportunityCard', () => {
	beforeEach(() => {
		vi.restoreAllMocks();

		vi.spyOn(rewardCampaignsEnv, 'rewardCampaigns', 'get').mockReturnValue(mockRewardCampaigns);

		vi.spyOn(formatUtils, 'formatToShortDateString').mockReturnValue('Dec 31, 2024');

		vi.spyOn(navModule, 'goto').mockResolvedValue();
	});

	it('renders the reward card title and description', () => {
		render(RewardsEarningOpportunityCard, { props: { card: mockCard }, context: mockContext });

		expect(screen.getByText('mock.rewards.title')).toBeInTheDocument();
		expect(screen.getByText('mock.rewards.description')).toBeInTheDocument();
	});

	it('renders the formatted end date', () => {
		render(RewardsEarningOpportunityCard, { props: { card: mockCard }, context: mockContext });

		expect(screen.getByText(/Dec 31, 2024/)).toBeInTheDocument();
	});

	it('renders the button with the correct text', () => {
		render(RewardsEarningOpportunityCard, { props: { card: mockCard }, context: mockContext });

		const button = screen.getByRole('button', { name: 'mock.rewards.action' });

		expect(button).toBeInTheDocument();
	});

	it('navigates to the rewards page when the button is clicked', async () => {
		render(RewardsEarningOpportunityCard, { props: { card: mockCard }, context: mockContext });

		const button = screen.getByRole('button', { name: 'mock.rewards.action' });
		await button.click();

		expect(navModule.goto).toHaveBeenCalledExactlyOnceWith(AppPath.EarnRewards);
	});

	it('renders nothing when no currentReward exists', () => {
		vi.spyOn(rewardCampaignsEnv, 'rewardCampaigns', 'get').mockReturnValue([]);

		const mockCtx = {
			getCampaignEligibility: vi.fn()
		};

		const { container } = render(RewardsEarningOpportunityCard, {
			props: { card: mockCard },
			context: new Map([[REWARD_ELIGIBILITY_CONTEXT_KEY, mockCtx]])
		});

		expect(container.textContent?.trim()).toBe('');
	});

	it('handles undefined campaignEligibility safely', () => {
		vi.spyOn(rewardCampaignsEnv, 'rewardCampaigns', 'get').mockReturnValue([
			{
				id: 'abc',
				endDate: new Date(),
				title: '',
				description: ''
			} as unknown as RewardCampaignDescription
		]);

		const mockCtx = {
			getCampaignEligibility: vi.fn().mockReturnValue(readable(undefined))
		};

		render(RewardsEarningOpportunityCard, {
			props: { card: mockCard },
			context: new Map([[REWARD_ELIGIBILITY_CONTEXT_KEY, mockCtx]])
		});

		expect(screen.getByText('mock.rewards.title')).toBeInTheDocument();
	});

	it('uses default fallback values when eligibility fields are missing', () => {
		const mockCtx = {
			getCampaignEligibility: vi.fn().mockReturnValue(readable({ campaignId: 'xyz' }))
		};

		render(RewardsEarningOpportunityCard, {
			props: { card: mockCard },
			context: new Map([[REWARD_ELIGIBILITY_CONTEXT_KEY, mockCtx]])
		});

		expect(screen.getByText('mock.rewards.title')).toBeInTheDocument();
	});
});
