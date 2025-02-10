import AllAirdropsList from '$lib/components/airdrops/AllAirdropsList.svelte';
import {
	AIRDROPS_ACTIVE_CAMPAIGNS_CONTAINER,
	AIRDROPS_BANNER,
	AIRDROPS_UPCOMING_CAMPAIGNS_CONTAINER
} from '$lib/constants/test-ids.constants';
import { render } from '@testing-library/svelte';

describe('AllAirdropsList', () => {
	const activeCampaignContainerSelector = `div[data-tid="${AIRDROPS_ACTIVE_CAMPAIGNS_CONTAINER}"]`;
	const upcomingCampaignContainerSelector = `div[data-tid="${AIRDROPS_UPCOMING_CAMPAIGNS_CONTAINER}"]`;
	const imageBannerSelector = `img[data-tid="${AIRDROPS_BANNER}"]`;

	it('should render image banner and campaigns', () => {
		const { container } = render(AllAirdropsList);

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
