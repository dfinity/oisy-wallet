import * as navModule from '$app/navigation';
import * as rewardCampaignsEnv from '$env/reward-campaigns.env';
import AllEarningOpportunityCardList from '$lib/components/earning/AllEarningOpportunityCardList.svelte';
import * as earningDerived from '$lib/derived/earning.derived';
import * as earningRegistry from '$lib/providers/earning.providers';
import { REWARD_ELIGIBILITY_CONTEXT_KEY } from '$lib/stores/reward.store';
import {
	mockHarvestProvider,
	mockHarvestProviderData,
	mockRewardsProvider
} from '$tests/mocks/earning-providers.mock';
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

		vi.spyOn(earningRegistry, 'earningProviders', 'get').mockReturnValue([
			mockRewardsProvider,
			mockHarvestProvider
		]);

		vi.spyOn(rewardCampaignsEnv, 'rewardCampaigns', 'get').mockReturnValue(mockRewardCampaigns);

		vi.spyOn(earningDerived, 'earningData', 'get').mockReturnValue(
			readable({
				'harvest-autopilot': {
					...mockHarvestProviderData,
					action: () => navModule.goto('/earn/autopilot/')
				}
			})
		);

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
