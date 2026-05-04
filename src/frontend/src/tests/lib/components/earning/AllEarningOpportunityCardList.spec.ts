import * as navModule from '$app/navigation';
import * as earningCardsEnv from '$env/earning-cards.env';
import * as rewardCampaignsEnv from '$env/reward-campaigns.env';
import { EarningCardFields } from '$env/types/env.earning-cards';
import AllEarningOpportunityCardList from '$lib/components/earning/AllEarningOpportunityCardList.svelte';
import * as earningDerived from '$lib/derived/earning.derived';
import { REWARD_ELIGIBILITY_CONTEXT_KEY } from '$lib/stores/reward.store';
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
		writable({
			campaignId: id,
			eligible: true,
			probabilityMultiplierEnabled: true,
			probabilityMultiplier: 1.2,
			criteria: ['criterion1']
		})
};

const mockContexts = new Map<symbol, unknown>([
	[REWARD_ELIGIBILITY_CONTEXT_KEY, mockRewardEligibilityContext]
]);

describe('AllEarningOpportunityCardList', () => {
	beforeEach(() => {
		vi.resetAllMocks();

		vi.spyOn(earningCardsEnv, 'earningCards', 'get').mockReturnValue([
			{
				id: mockRewardCampaigns[mockRewardCampaigns.length - 1].id,
				titles: ['mock.rewards.title'],
				description: 'mock.rewards.description',
				logo: '/images/rewards/oisy-reward-logo.svg',
				fields: [],
				actionText: 'mock.rewards.action'
			},
			{
				id: 'harvest-autopilot',
				titles: ['mock.harvest.title'],
				description: 'mock.harvest.description',
				logo: '/mock/logo.svg',
				fields: [
					EarningCardFields.NETWORKS,
					EarningCardFields.ASSETS,
					EarningCardFields.CURRENT_EARNING,
					EarningCardFields.EARNING_POTENTIAL
				],
				actionText: 'mock.harvest.action'
			}
		]);

		vi.spyOn(rewardCampaignsEnv, 'rewardCampaigns', 'get').mockReturnValue(mockRewardCampaigns);

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

		// mock navigation
		vi.spyOn(navModule, 'goto').mockResolvedValue();
	});

	it('renders earning cards', () => {
		render(AllEarningOpportunityCardList, { context: mockContexts });

		expect(screen.getByText('mock.rewards.title')).toBeInTheDocument();
		expect(screen.getByText('mock.rewards.description')).toBeInTheDocument();
		expect(screen.getByText('mock.harvest.title')).toBeInTheDocument();
		expect(screen.getByText('mock.harvest.description')).toBeInTheDocument();
	});

	it('renders all card buttons with correct text', () => {
		render(AllEarningOpportunityCardList, { context: mockContexts });

		const buttons = screen
			.getAllByRole('button')
			.filter((btn) => btn.getAttribute('type') === 'submit');

		expect(buttons).toHaveLength(2);
		expect(buttons[0]).toHaveTextContent('mock.rewards.action');
		expect(buttons[1]).toHaveTextContent('mock.harvest.action');
	});

	it('calls goto when a card action button is clicked', async () => {
		render(AllEarningOpportunityCardList, { context: mockContexts });

		const buttons = screen
			.getAllByRole('button')
			.filter((btn) => btn.getAttribute('type') === 'submit');

		expect(buttons).toHaveLength(2);

		for (const btn of buttons) {
			await btn.click();
		}

		expect(navModule.goto).toHaveBeenCalledTimes(2);
	});
});
