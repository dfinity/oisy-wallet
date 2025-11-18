import * as navModule from '$app/navigation';
import * as earningCardsEnv from '$env/earning-cards.env';
import * as rewardCampaignsEnv from '$env/reward-campaigns.env';
import type { RewardCampaignDescription } from '$env/types/env-reward';
import RewardsEarningOpportunityCard from '$lib/components/earning/RewardsEarningOpportunityCard.svelte';
import { AppPath } from '$lib/constants/routes.constants';
import { REWARD_ELIGIBILITY_CONTEXT_KEY } from '$lib/stores/reward.store';
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

		expect(navModule.goto).toHaveBeenCalledOnce();
		expect(navModule.goto).toHaveBeenCalledWith(AppPath.EarningRewards);
	});

	it('renders nothing if no matching earning card is found for the current reward', () => {
		vi.spyOn(earningCardsEnv, 'earningCards', 'get').mockReturnValue([]);

		const { container } = render(RewardsEarningOpportunityCard, { context: mockContext });

		expect(container.textContent?.trim()).toBe('');
	});

	it('handles missing currentReward gracefully', () => {
		vi.spyOn(rewardCampaignsEnv, 'rewardCampaigns', 'get').mockReturnValue([]);

		const mockCtx = {
			getCampaignEligibility: vi.fn()
		};

		render(RewardsEarningOpportunityCard, {
			context: new Map([[REWARD_ELIGIBILITY_CONTEXT_KEY, mockCtx]])
		});

		expect(mockCtx.getCampaignEligibility).not.toHaveBeenCalled();
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

		const earningCards = [
			{
				id: 'abc',
				title: 'x',
				description: 'y',
				logo: 'z',
				actionText: 'a',
				fields: []
			}
		];

		vi.spyOn(earningCardsEnv, 'earningCards', 'get').mockReturnValue(earningCards);

		render(RewardsEarningOpportunityCard, {
			context: new Map([[REWARD_ELIGIBILITY_CONTEXT_KEY, mockCtx]])
		});

		expect(screen.getByText('x')).toBeInTheDocument();
	});

	it('does not render card if matching earningCard does not exist', () => {
		vi.spyOn(earningCardsEnv, 'earningCards', 'get').mockReturnValue([]);

		vi.spyOn(rewardCampaignsEnv, 'rewardCampaigns', 'get').mockReturnValue([
			{
				id: 'no-match',
				endDate: new Date(),
				title: 'x',
				description: 'y'
			} as unknown as RewardCampaignDescription
		]);

		const mockCtx = {
			getCampaignEligibility: vi.fn().mockReturnValue(readable(undefined))
		};

		const { container } = render(RewardsEarningOpportunityCard, {
			context: new Map([[REWARD_ELIGIBILITY_CONTEXT_KEY, mockCtx]])
		});

		expect(container.textContent?.trim()).toBe('');
	});

	it('uses default fallback values when eligibility fields are missing', () => {
		vi.spyOn(earningCardsEnv, 'earningCards', 'get').mockReturnValue([
			{
				id: 'xyz',
				title: 'mock.title',
				description: 'mock.desc',
				logo: 'mock.svg',
				fields: [],
				actionText: 'foo'
			}
		]);

		vi.spyOn(rewardCampaignsEnv, 'rewardCampaigns', 'get').mockReturnValue([
			{
				id: 'xyz',
				endDate: new Date(),
				title: '',
				description: ''
			} as unknown as RewardCampaignDescription
		]);

		const mockEligibility = readable({
			campaignId: 'xyz'
		});

		const mockCtx = {
			getCampaignEligibility: vi.fn().mockReturnValue(mockEligibility)
		};

		render(RewardsEarningOpportunityCard, {
			context: new Map([[REWARD_ELIGIBILITY_CONTEXT_KEY, mockCtx]])
		});

		expect(screen.getByText('mock.title')).toBeInTheDocument();
	});

	it('does not call getCampaignEligibility when no current reward exists', () => {
		vi.spyOn(rewardCampaignsEnv, 'rewardCampaigns', 'get').mockReturnValue([]);

		const getCampaignEligibility = vi.fn();

		render(RewardsEarningOpportunityCard, {
			context: new Map([[REWARD_ELIGIBILITY_CONTEXT_KEY, { getCampaignEligibility }]])
		});

		expect(getCampaignEligibility).not.toHaveBeenCalled();
	});

	it('uses fallback eligibility values when campaignEligibility is undefined', () => {
		vi.spyOn(rewardCampaignsEnv, 'rewardCampaigns', 'get').mockReturnValue([
			{
				id: 'abc',
				endDate: new Date(),
				title: '',
				description: ''
			} as unknown as RewardCampaignDescription
		]);

		vi.spyOn(earningCardsEnv, 'earningCards', 'get').mockReturnValue([
			{
				id: 'abc',
				title: 'mock.title',
				description: 'mock.desc',
				logo: 'x',
				fields: [],
				actionText: 'mock.action'
			}
		]);

		const getCampaignEligibility = vi.fn().mockReturnValue(readable(undefined));

		render(RewardsEarningOpportunityCard, {
			context: new Map([[REWARD_ELIGIBILITY_CONTEXT_KEY, { getCampaignEligibility }]])
		});

		expect(screen.getByText('mock.title')).toBeInTheDocument();
	});

	it('renders nothing when no matching cardData exists', () => {
		vi.spyOn(rewardCampaignsEnv, 'rewardCampaigns', 'get').mockReturnValue([
			{
				id: 'no-match',
				endDate: new Date(),
				title: '',
				description: ''
			} as unknown as RewardCampaignDescription
		]);

		vi.spyOn(earningCardsEnv, 'earningCards', 'get').mockReturnValue([]);

		const getCampaignEligibility = vi.fn().mockReturnValue(readable(undefined));

		const { container } = render(RewardsEarningOpportunityCard, {
			context: new Map([[REWARD_ELIGIBILITY_CONTEXT_KEY, { getCampaignEligibility }]])
		});

		expect(container.textContent?.trim()).toBe('');
	});
});
