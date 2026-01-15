import { rewardCampaigns, SPRINKLES_SEASON_1_EPISODE_4_ID } from '$env/reward-campaigns.env';
import type { RewardCampaignDescription } from '$env/types/env-reward';
import WelcomeModal from '$lib/components/welcome/WelcomeModal.svelte';
import { OISY_REWARDS_URL, OISY_WELCOME_TWITTER_URL } from '$lib/constants/oisy.constants';
import {
	WELCOME_MODAL_IMAGE_BANNER,
	WELCOME_MODAL_LEARN_MORE_ANCHOR,
	WELCOME_MODAL_SHARE_ANCHOR
} from '$lib/constants/test-ids.constants';
import { i18n } from '$lib/stores/i18n.store';
import { resolveText } from '$lib/utils/i18n.utils';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('WelcomeModal', () => {
	const imageBannerSelector = `img[data-tid="${WELCOME_MODAL_IMAGE_BANNER}"]`;
	const learnMoreAnchorSelector = `a[data-tid="${WELCOME_MODAL_LEARN_MORE_ANCHOR}"]`;
	const shareAnchorSelector = `a[data-tid="${WELCOME_MODAL_SHARE_ANCHOR}"]`;

	const mockRewardCampaign: RewardCampaignDescription | undefined = rewardCampaigns.find(
		({ id }) => id === SPRINKLES_SEASON_1_EPISODE_4_ID
	);
	assertNonNullish(mockRewardCampaign);

	it('should render welcome modal content', () => {
		const { container, getByText } = render(WelcomeModal, {
			props: { reward: mockRewardCampaign }
		});

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

		expect(imageBanner).toBeInTheDocument();

		assertNonNullish(mockRewardCampaign.welcome?.subtitle);

		expect(
			getByText(resolveText({ i18n: get(i18n), path: mockRewardCampaign.welcome.subtitle }))
		).toBeInTheDocument();

		const learnMoreAnchor: HTMLAnchorElement | null =
			container.querySelector(learnMoreAnchorSelector);

		expect(learnMoreAnchor).toBeInTheDocument();
		expect(learnMoreAnchor?.href).toEqual(OISY_REWARDS_URL);

		const shareAnchor: HTMLAnchorElement | null = container.querySelector(shareAnchorSelector);

		expect(shareAnchor).toBeInTheDocument();
		expect(shareAnchor?.href).toEqual(OISY_WELCOME_TWITTER_URL);
	});
});
