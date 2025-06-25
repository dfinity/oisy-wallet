import * as rewardCampaigns from '$env/reward-campaigns.env';
import AllRewardsList from '$lib/components/rewards/AllRewardsList.svelte';
import {
	REWARDS_ACTIVE_CAMPAIGNS_CONTAINER,
	REWARDS_ENDED_CAMPAIGNS_CONTAINER,
	REWARDS_FILTER,
	REWARDS_UPCOMING_CAMPAIGNS_CONTAINER
} from '$lib/constants/test-ids.constants';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockRewardCampaigns } from '$tests/mocks/reward-campaigns.mock';
import { render, waitFor } from '@testing-library/svelte';

describe('AllRewardsList', () => {
	const activeCampaignContainerSelector = `div[data-tid="${REWARDS_ACTIVE_CAMPAIGNS_CONTAINER}"]`;
	const upcomingCampaignContainerSelector = `div[data-tid="${REWARDS_UPCOMING_CAMPAIGNS_CONTAINER}"]`;
	const endedCampaignContainerSelector = `div[data-tid="${REWARDS_ENDED_CAMPAIGNS_CONTAINER}"]`;
	const rewardsFilterContainerSelector = `div[data-tid="${REWARDS_FILTER}"]`;
	const rewardsFilterEndedButtonSelector = `button[data-tid="${REWARDS_FILTER}-ended-button"]`;

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(rewardCampaigns, 'rewardCampaigns', 'get').mockImplementation(
			() => mockRewardCampaigns
		);

		mockAuthStore();
	});

	it('should render reward filter and ongoing campaigns', () => {
		const { container } = render(AllRewardsList);

		const rewardsFilterContainer: HTMLDivElement | null = container.querySelector(
			rewardsFilterContainerSelector
		);

		expect(rewardsFilterContainer).toBeInTheDocument();

		const activeCampaignContainer: HTMLDivElement | null = container.querySelector(
			activeCampaignContainerSelector
		);

		expect(activeCampaignContainer).toBeInTheDocument();

		const upcomingCampaignContainer: HTMLDivElement | null = container.querySelector(
			upcomingCampaignContainerSelector
		);

		expect(upcomingCampaignContainer).toBeInTheDocument();

		const endedCampaignContainer: HTMLDivElement | null = container.querySelector(
			endedCampaignContainerSelector
		);

		expect(endedCampaignContainer).not.toBeInTheDocument();
	});

	it('should render reward filter and ended campaigns', async () => {
		const { container } = render(AllRewardsList);

		const rewardsFilterContainer: HTMLDivElement | null = container.querySelector(
			rewardsFilterContainerSelector
		);

		expect(rewardsFilterContainer).toBeInTheDocument();

		const rewardsFilterEndedButton: HTMLButtonElement | null = container.querySelector(
			rewardsFilterEndedButtonSelector
		);

		expect(rewardsFilterEndedButton).toBeInTheDocument();

		await waitFor(() => rewardsFilterEndedButton?.click());

		const activeCampaignContainer: HTMLDivElement | null = container.querySelector(
			activeCampaignContainerSelector
		);

		expect(activeCampaignContainer).not.toBeInTheDocument();

		const upcomingCampaignContainer: HTMLDivElement | null = container.querySelector(
			upcomingCampaignContainerSelector
		);

		expect(upcomingCampaignContainer).not.toBeInTheDocument();

		const endedCampaignContainer: HTMLDivElement | null = container.querySelector(
			endedCampaignContainerSelector
		);

		expect(endedCampaignContainer).toBeInTheDocument();
	});
});
