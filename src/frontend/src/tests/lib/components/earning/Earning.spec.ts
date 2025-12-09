import EarningOpportunitiesPage from '$lib/components/earning/Earning.svelte';
import { render, screen } from '@testing-library/svelte';

import * as earningCardsEnv from '$env/earning-cards.env';
import * as rewardCampaignsEnv from '$env/reward-campaigns.env';

import { EarningCardFields } from '$env/types/env.earning-cards';
import { GLDT_STAKE_CONTEXT_KEY } from '$icp/stores/gldt-stake.store';
import { i18n } from '$lib/stores/i18n.store';
import { REWARD_ELIGIBILITY_CONTEXT_KEY } from '$lib/stores/reward.store';
import { mockRewardCampaigns } from '$tests/mocks/reward-campaigns.mock';
import { get, writable } from 'svelte/store';

const mockGldtStakeStore = {
	subscribe: (fn: (v: unknown) => void) => {
		fn({ apy: 5, position: { staked: 10 } });
		return () => {};
	},
	setApy: vi.fn(),
	resetApy: vi.fn(),
	setPosition: vi.fn(),
	resetPosition: vi.fn(),
	reset: vi.fn()
};

const mockRewardEligibilityStore = writable({
	campaignEligibilities: [
		{
			campaignId: mockRewardCampaigns[mockRewardCampaigns.length - 1].id,
			eligible: true,
			probabilityMultiplierEnabled: true,
			probabilityMultiplier: 1.2,
			criteria: ['criterion1']
		}
	]
});

const mockRewardEligibilityContext = {
	store: mockRewardEligibilityStore,
	getCampaignEligibility: () =>
		writable({
			campaignId: mockRewardCampaigns[mockRewardCampaigns.length - 1].id,
			eligible: true,
			probabilityMultiplierEnabled: true,
			probabilityMultiplier: 1.2,
			criteria: ['criterion1']
		})
};

describe('EarningOpportunitiesPage', () => {
	beforeEach(() => {
		vi.restoreAllMocks();

		// mock reward + earning cards
		vi.spyOn(rewardCampaignsEnv, 'rewardCampaigns', 'get').mockReturnValue(mockRewardCampaigns);

		vi.spyOn(earningCardsEnv, 'earningCards', 'get').mockReturnValue([
			{
				id: mockRewardCampaigns[mockRewardCampaigns.length - 1].id,
				titles: ['mock.rewards.title'],
				description: 'mock.rewards.description',
				logo: '/img/logo1.svg',
				fields: [],
				actionText: 'mock.rewards.action'
			},
			{
				id: 'gldt-staking',
				titles: ['mock.gldt.title'],
				description: 'mock.gldt.description',
				logo: '/mock/logo.svg',
				fields: [EarningCardFields.APY, EarningCardFields.CURRENT_STAKED],
				actionText: 'mock.gldt.action'
			}
		]);
	});

	it('renders PageTitle and nested earning components', () => {
		render(EarningOpportunitiesPage, {
			context: new Map<symbol, unknown>([
				[GLDT_STAKE_CONTEXT_KEY, { store: mockGldtStakeStore }],
				[REWARD_ELIGIBILITY_CONTEXT_KEY, mockRewardEligibilityContext]
			])
		});

		// The page heading snippet
		expect(screen.getByText(get(i18n).earning.text.earning_opportunities)).toBeInTheDocument();

		// Child components should show content from earning cards
		expect(screen.getByText('mock.rewards.title')).toBeInTheDocument();
		expect(screen.getByText('mock.gldt.title')).toBeInTheDocument();
	});
});
