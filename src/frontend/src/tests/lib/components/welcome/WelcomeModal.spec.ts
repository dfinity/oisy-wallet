import WelcomeModal from '$lib/components/welcome/WelcomeModal.svelte';
import { OISY_REWARDS_URL, OISY_WELCOME_TWITTER_URL } from '$lib/constants/oisy.constants';
import {
	WELCOME_MODAL_IMAGE_BANNER,
	WELCOME_MODAL_LEARN_MORE_ANCHOR,
	WELCOME_MODAL_SHARE_ANCHOR
} from '$lib/constants/test-ids.constants';
import { i18n } from '$lib/stores/i18n.store';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('WelcomeModal', () => {
	const imageBannerSelector = `img[data-tid="${WELCOME_MODAL_IMAGE_BANNER}"]`;
	const learnMoreAnchorSelector = `a[data-tid="${WELCOME_MODAL_LEARN_MORE_ANCHOR}"]`;
	const shareAnchorSelector = `a[data-tid="${WELCOME_MODAL_SHARE_ANCHOR}"]`;

	it('should render welcome modal content', () => {
		const { container, getByText } = render(WelcomeModal);

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

		expect(imageBanner).toBeInTheDocument();

		expect(getByText(get(i18n).welcome.subtitle)).toBeInTheDocument();

		const learnMoreAnchor: HTMLAnchorElement | null =
			container.querySelector(learnMoreAnchorSelector);

		expect(learnMoreAnchor).toBeInTheDocument();
		expect(learnMoreAnchor?.href).toEqual(OISY_REWARDS_URL);

		const shareAnchor: HTMLAnchorElement | null = container.querySelector(shareAnchorSelector);

		expect(shareAnchor).toBeInTheDocument();
		expect(shareAnchor?.href).toEqual(OISY_WELCOME_TWITTER_URL);
	});
});
