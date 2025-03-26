import ReferralStateModal from '$lib/components/referral/ReferralStateModal.svelte';
import {
	REFERRAL_STATE_MODAL_IMAGE_BANNER,
	REFERRAL_STATE_MODAL_SHARE_ANCHOR
} from '$lib/constants/test-ids.constants';
import { i18n } from '$lib/stores/i18n.store';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('ReferralStateModal', () => {
	const imageBannerSelector = `img[data-tid="${REFERRAL_STATE_MODAL_IMAGE_BANNER}"]`;
	const shareAnchorSelector = `a[data-tid=${REFERRAL_STATE_MODAL_SHARE_ANCHOR}]`;

	it('should render expected texts and items', () => {
		const { getByText, container } = render(ReferralStateModal);

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);
		const shareAnchor: HTMLAnchorElement | null = container.querySelector(shareAnchorSelector);

		expect(imageBanner).toBeInTheDocument();
		expect(shareAnchor).toBeInTheDocument();

		expect(getByText(get(i18n).referral.reward.text.title)).toBeInTheDocument();
		expect(getByText(get(i18n).referral.reward.text.content_title)).toBeInTheDocument();
		expect(getByText(get(i18n).referral.reward.text.content_text)).toBeInTheDocument();
		expect(getByText(get(i18n).referral.reward.text.open_wallet)).toBeInTheDocument();
	});
});
