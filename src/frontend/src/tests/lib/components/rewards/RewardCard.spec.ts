import { SPRINKLES_SEASON_1_EPISODE_3_ID } from '$env/reward-campaigns.env';
import type { RewardCampaignDescription } from '$env/types/env-reward';
import RewardCard from '$lib/components/rewards/RewardCard.svelte';
import { REWARDS_BANNER, REWARDS_STATUS_BUTTON } from '$lib/constants/test-ids.constants';
import {
	REWARD_ELIGIBILITY_CONTEXT_KEY,
	initRewardEligibilityContext,
	initRewardEligibilityStore
} from '$lib/stores/reward.store';
import { mockRewardCampaigns } from '$tests/mocks/reward-campaigns.mock';
import { mockCampaignEligibilities } from '$tests/mocks/reward-eligibility-report.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('RewardCard', () => {
	const testId = 'testId';
	const imageBannerSelector = `img[data-tid="${REWARDS_BANNER}"]`;
	const eligibleBadgeSelector = `span[data-tid="${testId}-badge"]`;
	const dateBadgeSelector = `span[data-tid="${testId}-date-badge"]`;
	const statusButtonSelector = `div[data-tid="${REWARDS_STATUS_BUTTON}"]`;

	const mockContext = new Map([]);
	const store = initRewardEligibilityStore();
	mockContext.set(REWARD_ELIGIBILITY_CONTEXT_KEY, initRewardEligibilityContext(store));
	store.setCampaignEligibilities(mockCampaignEligibilities);

	it('should render active reward card content', () => {
		const mockedReward: RewardCampaignDescription | undefined = mockRewardCampaigns.find(
			(campaign) => campaign.id === SPRINKLES_SEASON_1_EPISODE_3_ID
		);
		assertNonNullish(mockedReward);

		const { container, getByText } = render(RewardCard, {
			props: {
				onclick: vi.fn(),
				reward: mockedReward,
				testId
			},
			context: mockContext
		});

		expect(getByText(mockedReward.cardTitle)).toBeInTheDocument();
		expect(getByText(mockedReward.oneLiner)).toBeInTheDocument();

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

		expect(imageBanner).toBeInTheDocument();

		const eligibleBadge: HTMLSpanElement | null = container.querySelector(eligibleBadgeSelector);

		expect(eligibleBadge).toBeInTheDocument();

		const dateBadge: HTMLSpanElement | null = container.querySelector(dateBadgeSelector);

		expect(dateBadge).toBeInTheDocument();

		const statusButton: HTMLDivElement | null = container.querySelector(statusButtonSelector);

		expect(statusButton).toBeInTheDocument();
	});

	it('should render inactive reward card content', () => {
		const mockedReward: RewardCampaignDescription | undefined = mockRewardCampaigns.find(
			(campaign) => campaign.id === 'sprinkles_s1e5'
		);
		assertNonNullish(mockedReward);

		const { container, getByText } = render(RewardCard, {
			props: {
				onclick: vi.fn(),
				reward: mockedReward,
				testId
			},
			context: mockContext
		});

		expect(getByText(mockedReward.cardTitle)).toBeInTheDocument();
		expect(getByText(mockedReward.oneLiner)).toBeInTheDocument();

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

		expect(imageBanner).toBeInTheDocument();
		expect(imageBanner).toHaveClass('grayscale');

		const eligibleBadge: HTMLSpanElement | null = container.querySelector(eligibleBadgeSelector);

		expect(eligibleBadge).not.toBeInTheDocument();

		const dateBadge: HTMLSpanElement | null = container.querySelector(dateBadgeSelector);

		expect(dateBadge).toBeInTheDocument();

		const statusButton: HTMLDivElement | null = container.querySelector(statusButtonSelector);

		expect(statusButton).toBeInTheDocument();
	});
});
