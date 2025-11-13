import { render, screen } from '@testing-library/svelte';
import { get, readable, writable } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AllEarningOpportunityCardList from '$lib/components/earning/AllEarningOpportunityCardList.svelte';

import * as navModule from '$app/navigation';
import * as tokenFilter from '$icp-eth/utils/token.utils';
import * as exchangeDerived from '$lib/derived/exchange.derived';
import * as tokensDerived from '$lib/derived/tokens.derived';
import * as formatUtils from '$lib/utils/format.utils';
import * as i18nUtils from '$lib/utils/i18n.utils';
import * as tokenUtils from '$lib/utils/token.utils';

import * as earningCardsEnv from '$env/earning-cards.env';
import * as rewardCampaignsEnv from '$env/reward-campaigns.env';
import { EarningCardFields } from '$env/types/env.earning-cards';
import { GLDT_STAKE_CONTEXT_KEY } from '$icp/stores/gldt-stake.store';
import { i18n } from '$lib/stores/i18n.store';
import { REWARD_ELIGIBILITY_CONTEXT_KEY } from '$lib/stores/reward.store';
import type { Token } from '$lib/types/token';
import { formatStakeApyNumber } from '$lib/utils/format.utils';
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
				title: 'mock.rewards.title',
				description: 'mock.rewards.description',
				logo: '/images/rewards/oisy-reward-logo.svg',
				fields: [],
				actionText: 'mock.rewards.action'
			},
			{
				id: 'gldt-staking',
				title: 'mock.gldt.title',
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

		vi.spyOn(tokensDerived, 'enabledFungibleTokensUi', 'get').mockReturnValue(
			enabledFungibleTokensUi
		);
		vi.spyOn(tokensDerived, 'enabledMainnetFungibleTokensUsdBalance', 'get').mockReturnValue(
			enabledMainnetFungibleTokensUsdBalance
		);

		vi.spyOn(exchangeDerived, 'exchanges', 'get').mockReturnValue(readable({}));

		// mock utils
		vi.spyOn(tokenFilter, 'isGLDTToken').mockReturnValue(true);
		vi.spyOn(tokenUtils, 'calculateTokenUsdAmount').mockReturnValue(123.45);
		vi.spyOn(formatUtils, 'formatToken').mockReturnValue('10.00');
		vi.spyOn(formatUtils, 'formatToShortDateString').mockReturnValue('Dec 31, 2024');
		vi.spyOn(i18nUtils, 'resolveText').mockImplementation(({ path }) => path);
		vi.spyOn(i18nUtils, 'replacePlaceholders').mockImplementation(
			(s, map) => `${s}-${map.$amount}`
		);

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

	it('displays current APY correctly when GLDT staking data is available', () => {
		render(AllEarningOpportunityCardList, { context: mockContexts });

		expect(screen.getByText(get(i18n).stake.text.current_apy_label)).toBeInTheDocument();
		expect(screen.getAllByText(`${formatStakeApyNumber(5)}%`)).toHaveLength(2);
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

	it('renders reward date text for the active reward card', () => {
		render(AllEarningOpportunityCardList, { context: mockContexts });

		expect(screen.getByText(/Dec 31, 2024/)).toBeInTheDocument();
	});

	it('renders the current staked amount correctly', () => {
		render(AllEarningOpportunityCardList, { context: mockContexts });

		// Should show the formatted staked token amount (mocked as "10.00")
		expect(screen.getByText(/10\.00/)).toBeInTheDocument();
	});

	it('renders the current earning USD value correctly', () => {
		render(AllEarningOpportunityCardList, { context: mockContexts });

		// Our mock of calculateTokenUsdAmount returns 123.45, so formatted as $123.45
		expect(screen.getByText(/\$123\.45/)).toBeInTheDocument();
	});

	it('renders earning potential field correctly', () => {
		render(AllEarningOpportunityCardList, { context: mockContexts });

		// Since APY = 5 and enabledMainnetFungibleTokensUsdBalance = 1000
		// earningPotential = 1000 * 5 / 100 = 50 -> formatted by EarningYearlyAmount
		expect(screen.getByText(/\$50\.00/)).toBeInTheDocument();
	});
});
