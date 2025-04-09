import type { RewardDescription } from '$env/types/env-reward';
import RewardCard from '$lib/components/rewards/RewardCard.svelte';
import { mockRewardCampaigns } from '$tests/mocks/reward-campaigns.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('RewardCard', () => {
	it('should render reward card content', () => {
		const mockedReward: RewardDescription | undefined = mockRewardCampaigns.find(
			(campaign) => campaign.id === 'OISY Airdrop #1'
		);
		assertNonNullish(mockedReward);

		const testId = 'testId';
		const logoSelector = `div[data-tid="${testId}-logo"]`;
		const badgeSelector = `span[data-tid="${testId}-badge"]`;

		const { container, getByText } = render(RewardCard, {
			props: {
				reward: mockedReward,
				testId
			}
		});

		expect(getByText(mockedReward.cardTitle)).toBeInTheDocument();
		expect(getByText(mockedReward.oneLiner)).toBeInTheDocument();

		const logo: HTMLDivElement | null = container.querySelector(logoSelector);
		expect(logo).toBeInTheDocument();

		const badge: HTMLSpanElement | null = container.querySelector(badgeSelector);
		expect(badge).toBeInTheDocument();
	});
});
