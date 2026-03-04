import * as navModule from '$app/navigation';
import * as earningCardsEnv from '$env/earning-cards.env';
import * as rewardCampaignsEnv from '$env/reward-campaigns.env';
import { EarningCardFields } from '$env/types/env.earning-cards';
import EarningOpportunitiesPage from '$lib/components/earning/Earning.svelte';
import * as earningDerived from '$lib/derived/earning.derived';
import { i18n } from '$lib/stores/i18n.store';
import { REWARD_ELIGIBILITY_CONTEXT_KEY } from '$lib/stores/reward.store';
import { mockRewardCampaigns } from '$tests/mocks/reward-campaigns.mock';
import { render, screen } from '@testing-library/svelte';
import { get, readable, writable } from 'svelte/store';

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
				id: 'harvest-autopilot',
				titles: ['mock.harvest.title'],
				description: 'mock.harvest.description',
				logo: '/mock/logo.svg',
				fields: [EarningCardFields.NETWORKS, EarningCardFields.CURRENT_EARNING],
				actionText: 'mock.harvest.action'
			}
		]);

		vi.spyOn(navModule, 'goto').mockResolvedValue();

		vi.spyOn(earningDerived, 'earningData', 'get').mockReturnValue(
			readable({
				'harvest-autopilot': {
					[EarningCardFields.APY]: '5.5',
					[EarningCardFields.CURRENT_STAKED]: 100,
					[EarningCardFields.CURRENT_EARNING]: 5.5,
					[EarningCardFields.NETWORKS]: ['eth-icon'],
					[EarningCardFields.ASSETS]: ['usdc-icon'],
					[EarningCardFields.EARNING_POTENTIAL]: 49.5,
					action: () => navModule.goto('/earn/autopilot/')
				}
			})
		);
	});

	it('renders PageTitle and nested earning components', () => {
		render(EarningOpportunitiesPage, {
			context: new Map<symbol, unknown>([
				[REWARD_ELIGIBILITY_CONTEXT_KEY, mockRewardEligibilityContext]
			])
		});

		// The page heading snippet
		expect(screen.getByText(get(i18n).earning.text.earning_opportunities)).toBeInTheDocument();

		// Child components should show content from earning cards
		expect(screen.getByText('mock.rewards.title')).toBeInTheDocument();
		expect(screen.getByText('mock.harvest.title')).toBeInTheDocument();
	});
});
