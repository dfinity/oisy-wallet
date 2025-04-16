import AllRewardsList from '$lib/components/rewards/AllRewardsList.svelte';
import {
	REWARDS_ACTIVE_CAMPAIGNS_CONTAINER,
	REWARDS_BANNER,
	REWARDS_UPCOMING_CAMPAIGNS_CONTAINER
} from '$lib/constants/test-ids.constants';
import { render } from '@testing-library/svelte';

describe('AllRewardsList', () => {
	const activeCampaignContainerSelector = `div[data-tid="${REWARDS_ACTIVE_CAMPAIGNS_CONTAINER}"]`;
	const upcomingCampaignContainerSelector = `div[data-tid="${REWARDS_UPCOMING_CAMPAIGNS_CONTAINER}"]`;
	const imageBannerSelector = `img[data-tid="${REWARDS_BANNER}"]`;

	it('should render image banner and campaigns', () => {
		const { container } = render(AllRewardsList);

		const activeCampaignContainer: HTMLDivElement | null = container.querySelector(
			activeCampaignContainerSelector
		);

		expect(activeCampaignContainer).toBeInTheDocument();

		const upcomingCampaignContainer: HTMLDivElement | null = container.querySelector(
			upcomingCampaignContainerSelector
		);

		expect(upcomingCampaignContainer).toBeInTheDocument();

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

		expect(imageBanner).toBeInTheDocument();
	});
});
