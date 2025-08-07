import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ICP_SYMBOL } from '$env/tokens/tokens.icp.env';
import type { RewardCampaignDescription } from '$env/types/env-reward';
import type { IcCkToken } from '$icp/types/ic-token';
import RewardEarnings from '$lib/components/rewards/RewardEarnings.svelte';
import { ZERO } from '$lib/constants/app.constants';
import {
	REWARDS_EARNINGS_ACTIVITY_BUTTON,
	REWARDS_EARNINGS_CARD
} from '$lib/constants/test-ids.constants';
import * as tokensStore from '$lib/derived/tokens.derived';
import * as rewardService from '$lib/services/reward.services';
import { i18n } from '$lib/stores/i18n.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { mockRewardCampaigns } from '$tests/mocks/reward-campaigns.mock';
import { render, waitFor } from '@testing-library/svelte';
import { get, readable } from 'svelte/store';

describe('RewardEarnings', () => {
	const ckBtcRewardEarningsCardSelector = `div[data-tid="${REWARDS_EARNINGS_CARD}-${BTC_MAINNET_TOKEN.twinTokenSymbol}"]`;
	const ckUsdcRewardEarningsCardSelector = `div[data-tid="${REWARDS_EARNINGS_CARD}-${USDC_TOKEN.twinTokenSymbol}"]`;
	const icpRewardEarningsCardSelector = `div[data-tid="${REWARDS_EARNINGS_CARD}-${ICP_SYMBOL}"]`;
	const rewardEarningsActivityButtonSelector = `button[data-tid="${REWARDS_EARNINGS_ACTIVITY_BUTTON}"]`;

	const mockedReward: RewardCampaignDescription = { ...mockRewardCampaigns[0] };

	const mockCkBtcToken = {
		...mockValidIcCkToken,
		symbol: BTC_MAINNET_TOKEN.twinTokenSymbol
	} as IcCkToken;

	const mockCkUsdcToken = {
		...mockValidIcCkToken,
		symbol: USDC_TOKEN.twinTokenSymbol
	} as IcCkToken;

	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();

		Object.defineProperty(window, 'navigator', {
			writable: true,
			value: {
				userAgentData: {
					mobile: false
				}
			}
		});

		vi.spyOn(rewardService, 'getUserRewardsTokenAmounts').mockResolvedValue({
			ckBtcReward: ZERO,
			ckUsdcReward: ZERO,
			icpReward: ZERO,
			amountOfRewards: 1
		});

		vi.spyOn(tokensStore, 'tokens', 'get').mockImplementation(() =>
			readable([BTC_MAINNET_TOKEN, mockCkBtcToken, mockCkUsdcToken])
		);
	});

	it('should render reward earnings content', async () => {
		const { container, getByText } = render(RewardEarnings, {
			props: {
				reward: mockedReward,
				amountOfRewards: 1
			}
		});

		const ckBtcRewardEarningsCard: HTMLDivElement | null = container.querySelector(
			ckBtcRewardEarningsCardSelector
		);
		const ckUsdcRewardEarningsCard: HTMLDivElement | null = container.querySelector(
			ckUsdcRewardEarningsCardSelector
		);
		const icpRewardEarningsCard: HTMLDivElement | null = container.querySelector(
			icpRewardEarningsCardSelector
		);

		const rewardEarningsActivityButton: HTMLButtonElement | null = container.querySelector(
			rewardEarningsActivityButtonSelector
		);

		await waitFor(() => {
			expect(ckBtcRewardEarningsCard).toBeInTheDocument();
			expect(ckUsdcRewardEarningsCard).toBeInTheDocument();
			expect(icpRewardEarningsCard).toBeInTheDocument();

			expect(rewardEarningsActivityButton).toBeInTheDocument();
		});

		expect(getByText(get(i18n).rewards.text.activity_button_text)).toBeInTheDocument();
	});

	it('should not render reward earnings content without rewards', async () => {
		vi.spyOn(rewardService, 'getUserRewardsTokenAmounts').mockResolvedValue({
			ckBtcReward: ZERO,
			ckUsdcReward: ZERO,
			icpReward: ZERO,
			amountOfRewards: 0
		});

		const { container, queryByText } = render(RewardEarnings, {
			props: {
				reward: mockedReward,
				amountOfRewards: 0
			}
		});

		const ckBtcRewardEarningsCard: HTMLDivElement | null = container.querySelector(
			ckBtcRewardEarningsCardSelector
		);
		const ckUsdcRewardEarningsCard: HTMLDivElement | null = container.querySelector(
			ckUsdcRewardEarningsCardSelector
		);
		const icpRewardEarningsCard: HTMLDivElement | null = container.querySelector(
			icpRewardEarningsCardSelector
		);

		const rewardEarningsActivityButton: HTMLButtonElement | null = container.querySelector(
			rewardEarningsActivityButtonSelector
		);

		await waitFor(() => {
			expect(ckBtcRewardEarningsCard).not.toBeInTheDocument();
			expect(ckUsdcRewardEarningsCard).not.toBeInTheDocument();
			expect(icpRewardEarningsCard).not.toBeInTheDocument();

			expect(rewardEarningsActivityButton).not.toBeInTheDocument();
		});

		expect(queryByText(get(i18n).rewards.text.activity_button_text)).not.toBeInTheDocument();
	});

	it('should render different activity button text on mobile', () => {
		Object.defineProperty(window, 'navigator', {
			writable: true,
			value: {
				userAgentData: {
					mobile: true
				}
			}
		});

		const { getByText } = render(RewardEarnings, {
			props: {
				reward: mockedReward,
				amountOfRewards: 1
			}
		});

		expect(getByText(get(i18n).rewards.text.activity_button_text_short)).toBeInTheDocument();
	});

	it('should only load received tokens once', () => {
		const rewardServiceSpy = vi
			.spyOn(rewardService, 'getUserRewardsTokenAmounts')
			.mockResolvedValue({
				ckBtcReward: ZERO,
				ckUsdcReward: ZERO,
				icpReward: ZERO,
				amountOfRewards: 1
			});

		render(RewardEarnings, {
			props: {
				reward: mockedReward,
				amountOfRewards: 1
			}
		});

		expect(rewardServiceSpy).toHaveBeenCalledOnce();
	});
});
