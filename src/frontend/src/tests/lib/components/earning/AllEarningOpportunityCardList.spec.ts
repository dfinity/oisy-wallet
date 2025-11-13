vi.mock('$env/earning-cards.json', () => ({}));
vi.mock('$env/reward-campaigns.json', () => ({}));

vi.mock('$env/earning-cards.env', () => ({
	earningCards: [
		{
			id: 'gldt-staking',
			title: 'earning.cards.gldt.title',
			description: 'earning.cards.gldt.description',
			logo: '/mock/logo.svg',
			fields: ['apy', 'currentStaked', 'currentEarning', 'earningPotential', 'terms'],
			actionText: 'earning.cards.gldt.action'
		}
	]
}));

vi.mock('$env/reward-campaigns.env', () => ({
	rewardCampaigns: [
		{
			id: 'reward1',
			endDate: new Date('2024-12-31'),
			probabilityMultiplierEnabled: true,
			probabilityMultiplier: 1.2,
			criteria: []
		}
	]
}));

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

// ---------- spies and mocks ----------

beforeEach(() => {
	vi.restoreAllMocks();

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
