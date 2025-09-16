import type { RewardCampaignDescription } from '$env/types/env-reward';
import RewardModal from '$lib/components/rewards/RewardModal.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { REWARDS_MODAL_IMAGE_BANNER } from '$lib/constants/test-ids.constants';
import * as rewardService from '$lib/services/reward.services';
import { i18n } from '$lib/stores/i18n.store';
import {
	initRewardEligibilityContext,
	initRewardEligibilityStore,
	REWARD_ELIGIBILITY_CONTEXT_KEY
} from '$lib/stores/reward.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockRewardCampaigns } from '$tests/mocks/reward-campaigns.mock';
import { mockCampaignEligibilities } from '$tests/mocks/reward-eligibility-report.mock';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('RewardModal', () => {
	const imageBannerSelector = `img[data-tid="${REWARDS_MODAL_IMAGE_BANNER}"]`;

	const mockContext = new Map([]);
	const store = initRewardEligibilityStore();
	mockContext.set(REWARD_ELIGIBILITY_CONTEXT_KEY, initRewardEligibilityContext(store));
	store.setCampaignEligibilities(mockCampaignEligibilities);

	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();

		vi.spyOn(rewardService, 'getUserRewardsTokenAmounts').mockResolvedValue({
			ckBtcReward: ZERO,
			ckUsdcReward: ZERO,
			icpReward: ZERO,
			amountOfRewards: 0
		});
	});

	it('should render active modal content', () => {
		Object.defineProperty(window, 'navigator', {
			writable: true,
			value: {
				userAgentData: {
					mobile: false
				}
			}
		});

		const mockedReward: RewardCampaignDescription = { ...mockRewardCampaigns[0] };

		const { container, getByText } = render(RewardModal, {
			props: {
				reward: mockedReward
			},
			context: mockContext
		});

		expect(getByText(mockedReward.title)).toBeInTheDocument();
		expect(getByText(mockedReward.description)).toBeInTheDocument();

		expect(
			getByText(
				replacePlaceholders(get(i18n).rewards.requirements.min_logins, {
					$logins: '2',
					$days: '6'
				})
			)
		).toBeInTheDocument();
		expect(
			getByText(
				replacePlaceholders(get(i18n).rewards.requirements.min_transactions_overall, {
					$transactions: '3',
					$days: '6'
				})
			)
		).toBeInTheDocument();
		expect(
			getByText(
				replacePlaceholders(get(i18n).rewards.requirements.min_total_assets_usd_overall, {
					$usd: '21'
				})
			)
		).toBeInTheDocument();

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

		expect(imageBanner).toBeInTheDocument();
	});

	it('should render ended modal content', () => {
		Object.defineProperty(window, 'navigator', {
			writable: true,
			value: {
				userAgentData: {
					mobile: false
				}
			}
		});

		const mockedReward: RewardCampaignDescription = { ...mockRewardCampaigns[2] };

		const { container, getByText, queryByText } = render(RewardModal, {
			props: {
				reward: mockedReward
			},
			context: mockContext
		});

		expect(getByText(mockedReward.title)).toBeInTheDocument();
		expect(getByText(mockedReward.description)).toBeInTheDocument();

		expect(
			queryByText(
				replacePlaceholders(get(i18n).rewards.requirements.min_logins, {
					$logins: '1',
					$days: '7'
				})
			)
		).not.toBeInTheDocument();
		expect(
			queryByText(
				replacePlaceholders(get(i18n).rewards.requirements.min_transactions_overall, {
					$transactions: '2',
					$days: '7'
				})
			)
		).not.toBeInTheDocument();
		expect(
			queryByText(
				replacePlaceholders(get(i18n).rewards.requirements.min_total_assets_usd_overall, {
					$usd: '18'
				})
			)
		).not.toBeInTheDocument();

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

		expect(imageBanner).toBeInTheDocument();
	});
});
