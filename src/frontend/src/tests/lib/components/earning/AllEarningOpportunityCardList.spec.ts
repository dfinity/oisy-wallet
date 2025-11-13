import { render, screen } from '@testing-library/svelte';
import { setContext } from 'svelte';
import { readable, writable } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AllEarningOpportunityCardList from '$lib/components/earning/AllEarningOpportunityCardList.svelte';

import * as navModule from '$app/navigation';
import * as tokenFilter from '$icp-eth/utils/token.utils';
import * as gldtStakeStoreModule from '$icp/stores/gldt-stake.store';
import * as exchangeDerived from '$lib/derived/exchange.derived';
import * as tokensDerived from '$lib/derived/tokens.derived';
import * as rewardStoreModule from '$lib/stores/reward.store';
import * as formatUtils from '$lib/utils/format.utils';
import * as i18nUtils from '$lib/utils/i18n.utils';
import * as tokenUtils from '$lib/utils/token.utils';

import * as earningCardsEnv from '$env/earning-cards.env';
import * as rewardCampaignsEnv from '$env/reward-campaigns.env';
import { EarningCardFields } from '$env/types/env.earning-cards';

// ---------- spies and mocks ----------

beforeEach(() => {
	vi.restoreAllMocks();

	vi.spyOn(earningCardsEnv, 'earningCards', 'get').mockReturnValue([
		{
			id: 'gldt-staking',
			title: 'earning.cards.gldt.title',
			description: 'earning.cards.gldt.description',
			logo: '/mock/logo.svg',
			fields: [
				EarningCardFields.APY,
				EarningCardFields.CURRENT_STAKED,
				EarningCardFields.CURRENT_EARNING,
				EarningCardFields.EARNING_POTENTIAL,
				EarningCardFields.TERMS
			],
			actionText: 'earning.cards.gldt.action'
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

	const mockRewardEligibilityStore = writable({
		campaignEligibilities: [
			{
				campaignId: 'reward1',
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

	setContext(gldtStakeStoreModule.GLDT_STAKE_CONTEXT_KEY, { store: mockGldtStakeStore });
	setContext(rewardStoreModule.REWARD_ELIGIBILITY_CONTEXT_KEY, mockRewardEligibilityContext);
});

// ---------- tests ----------

describe('AllEarningOpportunityCardList', () => {
	it('renders earning cards', () => {
		render(AllEarningOpportunityCardList);
		expect(screen.getByText('mock.title')).toBeInTheDocument();
		expect(screen.getByText('mock.desc')).toBeInTheDocument();
	});

	it('renders the button with correct text', () => {
		render(AllEarningOpportunityCardList);
		expect(screen.getByRole('button')).toHaveTextContent('mock.action');
	});

	it('displays current APY correctly when GLDT staking data is available', () => {
		render(AllEarningOpportunityCardList);
		expect(screen.getByText(/Current APY/i)).toBeInTheDocument();
		expect(screen.getByText('5.00%')).toBeInTheDocument();
	});

	it('calls goto when the card button is clicked', async () => {
		render(AllEarningOpportunityCardList);
		const btn = screen.getByRole('button');
		await btn.click();
		expect(navModule.goto).toHaveBeenCalledTimes(1);
	});

	it('renders reward date text', () => {
		render(AllEarningOpportunityCardList);
		expect(screen.getByText(/Dec 31, 2024/)).toBeInTheDocument();
	});
});
