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
import { formatStakeApyNumber } from '$lib/utils/format.utils';

// ---------- spies and mocks ----------

// ---------- mock contexts ----------
const mockGldtStakeStore = {
	subscribe: (fn: (v: any) => void) => {
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

beforeEach(() => {
	vi.restoreAllMocks();

	vi.spyOn(earningCardsEnv, 'earningCards', 'get').mockReturnValue([
		{
			id: 'sprinkles_s1e5',
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

	vi.spyOn(rewardCampaignsEnv, 'rewardCampaigns', 'get').mockReturnValue([
		{
			id: 'sprinkles_s1e5',
			title: 'rewards.campaigns.sprinkles_s1e5.title',
			cardTitle: 'rewards.campaigns.sprinkles_s1e5.card_title',
			oneLiner: 'rewards.campaigns.sprinkles_s1e5.one_liner',
			participateTitle: 'rewards.campaigns.sprinkles_s1e5.participate_title',
			description: 'rewards.campaigns.sprinkles_s1e5.description',
			logo: '/images/rewards/oisy-reward-logo.svg',
			cardBanner: '/images/rewards/oisy-episode-five-campaign.webp',
			campaignHref: 'rewards.campaigns.sprinkles_s1e5.campaign_href',
			learnMoreHref: 'https://docs.oisy.com/rewards/oisy-sprinkles',
			startDate: new Date('2025-09-24T12:00:00.000Z'),
			endDate: new Date('2030-12-18T12:00:00.000Z'),
			welcome: {
				title: 'rewards.campaigns.sprinkles_s1e5.welcome.title',
				subtitle: 'rewards.campaigns.sprinkles_s1e5.welcome.subtitle',
				description: 'rewards.campaigns.sprinkles_s1e5.welcome.description'
			},
			win: {
				default: {
					title: 'rewards.campaigns.sprinkles_s1e5.win.default.title',
					banner: '/images/rewards/reward-received.svg',
					description: 'rewards.campaigns.sprinkles_s1e5.win.default.description',
					shareHref: 'rewards.campaigns.sprinkles_s1e5.win.default.share_href'
				},
				jackpot: {
					title: 'rewards.campaigns.sprinkles_s1e5.win.jackpot.title',
					banner: '/images/rewards/reward-jackpot-received.svg',
					description: 'rewards.campaigns.sprinkles_s1e5.win.jackpot.description',
					shareHref: 'rewards.campaigns.sprinkles_s1e5.win.jackpot.share_href'
				},
				leaderboard: {
					title: 'rewards.campaigns.sprinkles_s1e5.win.leaderboard.title',
					banner: '/images/rewards/reward-jackpot-received.svg',
					description: 'rewards.campaigns.sprinkles_s1e5.win.leaderboard.description',
					shareHref: 'rewards.campaigns.sprinkles_s1e5.win.leaderboard.share_href'
				},
				referral: {
					title: 'rewards.campaigns.sprinkles_s1e5.win.referral.title',
					banner: '/images/rewards/reward-received.svg',
					description: 'rewards.campaigns.sprinkles_s1e5.win.referral.description',
					shareHref: 'rewards.campaigns.sprinkles_s1e5.win.referral.share_href'
				}
			}
		}
	]);

	// mock derived stores
	const enabledFungibleTokensUi = writable([]);
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
	vi.spyOn(i18nUtils, 'replacePlaceholders').mockImplementation((s, map) => `${s}-${map.$amount}`);

	// mock navigation
	vi.spyOn(navModule, 'goto').mockResolvedValue();
});

const mockContexts = new Map<symbol, unknown>([
	[GLDT_STAKE_CONTEXT_KEY, mockGldtStakeContext],
	[REWARD_ELIGIBILITY_CONTEXT_KEY, mockRewardEligibilityContext]
]);

describe('AllEarningOpportunityCardList', () => {
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

		// Should show the formatted yearly earning via <EarningYearlyAmount>
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
