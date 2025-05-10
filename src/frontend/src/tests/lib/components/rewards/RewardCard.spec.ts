import type { RewardDescription } from '$env/types/env-reward';
import RewardCard from '$lib/components/rewards/RewardCard.svelte';
import { REWARDS_BANNER, REWARDS_STATUS_BUTTON } from '$lib/constants/test-ids.constants';
import { mockRewardCampaigns } from '$tests/mocks/reward-campaigns.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('RewardCard', () => {
	const testId = 'testId';
	const imageBannerSelector = `img[data-tid="${REWARDS_BANNER}"]`;
	const dateBadgeSelector = `span[data-tid="${testId}-date-badge"]`;
	const statusButtonSelector = `div[data-tid="${REWARDS_STATUS_BUTTON}"]`;

	it('should render active reward card content', () => {
		const mockedReward: RewardDescription | undefined = mockRewardCampaigns.find(
			(campaign) => campaign.id === 'OISY Airdrop #1'
		);
		assertNonNullish(mockedReward);

		const { container, getByText } = render(RewardCard, {
			props: {
				onclick: vi.fn(),
				reward: mockedReward,
				testId
			}
		});

		expect(getByText(mockedReward.cardTitle)).toBeInTheDocument();
		expect(getByText(mockedReward.oneLiner)).toBeInTheDocument();

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

		expect(imageBanner).toBeInTheDocument();

		const dateBadge: HTMLSpanElement | null = container.querySelector(dateBadgeSelector);

		expect(dateBadge).toBeInTheDocument();

		const statusButton: HTMLDivElement | null = container.querySelector(statusButtonSelector);

		expect(statusButton).toBeInTheDocument();
	});
});
