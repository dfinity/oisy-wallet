import { render, screen } from '@testing-library/svelte';
import { readable, writable } from 'svelte/store';

import AllEarningOpportunityCardList from '$lib/components/earning/AllEarningOpportunityCardList.svelte';

import * as navModule from '$app/navigation';
import * as tokenFilter from '$icp-eth/utils/token.utils';
import * as exchangeDerived from '$lib/derived/exchange.derived';
import * as tokensUiDerived from '$lib/derived/tokens-ui.derived';
import * as formatUtils from '$lib/utils/format.utils';
import * as tokenUtils from '$lib/utils/token.utils';

import * as earningCardsEnv from '$env/earning-cards.env';
import * as rewardCampaignsEnv from '$env/reward-campaigns.env';
import { EarningCardFields } from '$env/types/env.earning-cards';
import { GLDT_STAKE_CONTEXT_KEY } from '$icp/stores/gldt-stake.store';
import { REWARD_ELIGIBILITY_CONTEXT_KEY } from '$lib/stores/reward.store';
import type { Token } from '$lib/types/token';
import { mockRewardCampaigns } from '$tests/mocks/reward-campaigns.mock';

// mock contexts
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

const mockGldtStakeContext = { store: mockGldtStakeStore };

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
	[GLDT_STAKE_CONTEXT_KEY, mockGldtStakeContext],
	[REWARD_ELIGIBILITY_CONTEXT_KEY, mockRewardEligibilityContext]
]);

describe('AllEarningOpportunityCardList', () => {
	beforeEach(() => {
		vi.restoreAllMocks();

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
				id: 'gldt-staking',
				titles: ['mock.gldt.title'],
				description: 'mock.gldt.description',
				logo: '/mock/logo.svg',
				fields: [
					EarningCardFields.APY,
					EarningCardFields.CURRENT_STAKED,
					EarningCardFields.CURRENT_EARNING,
					EarningCardFields.EARNING_POTENTIAL,
					EarningCardFields.TERMS
				],
				actionText: 'mock.gldt.action'
			}
		]);

		vi.spyOn(rewardCampaignsEnv, 'rewardCampaigns', 'get').mockReturnValue(mockRewardCampaigns);

		const mockGldtToken = {
			id: 'mock-gldt',
			symbol: 'GLDT',
			name: 'Gold DAO Token',
			decimals: 8,
			network: { id: 'mock-network', env: 'mainnet' },
			address: '0xmock',
			enabled: true
		} as unknown as Token;

		// mock derived stores
		const enabledFungibleTokensUi = writable([mockGldtToken]);
		const enabledMainnetFungibleTokensUsdBalance = readable(1000);

		vi.spyOn(tokensUiDerived, 'enabledFungibleTokensUi', 'get').mockReturnValue(
			enabledFungibleTokensUi
		);
		vi.spyOn(tokensUiDerived, 'enabledMainnetFungibleTokensUsdBalance', 'get').mockReturnValue(
			enabledMainnetFungibleTokensUsdBalance
		);

		vi.spyOn(exchangeDerived, 'exchanges', 'get').mockReturnValue(readable({}));

		// mock utils
		vi.spyOn(tokenFilter, 'isGLDTToken').mockReturnValue(true);
		vi.spyOn(tokenUtils, 'calculateTokenUsdAmount').mockReturnValue(123.45);
		vi.spyOn(formatUtils, 'formatToken').mockReturnValue('10.00');
		vi.spyOn(formatUtils, 'formatToShortDateString').mockReturnValue('Dec 31, 2024');

		// mock navigation
		vi.spyOn(navModule, 'goto').mockResolvedValue();
	});

	it('renders earning cards', () => {
		render(AllEarningOpportunityCardList, { context: mockContexts });

		expect(screen.getByText('mock.rewards.title')).toBeInTheDocument();
		expect(screen.getByText('mock.rewards.description')).toBeInTheDocument();
		expect(screen.getByText('mock.gldt.title')).toBeInTheDocument();
		expect(screen.getByText('mock.gldt.description')).toBeInTheDocument();
	});

	it('renders all card buttons with correct text', () => {
		render(AllEarningOpportunityCardList, { context: mockContexts });

		const buttons = screen
			.getAllByRole('button')
			.filter((btn) => btn.getAttribute('type') === 'submit');

		expect(buttons).toHaveLength(2);
		expect(buttons[0]).toHaveTextContent('mock.rewards.action');
		expect(buttons[1]).toHaveTextContent('mock.gldt.action');
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
