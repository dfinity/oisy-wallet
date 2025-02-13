import type { AirdropDescription } from '$env/types/env-airdrop';
import airdropJackpotReceived from '$lib/assets/airdrop-jackpot-received.svg';
import airdropReceived from '$lib/assets/airdrop-received.svg';
import AirdropStateModal from '$lib/components/airdrops/AirdropStateModal.svelte';
import {
	AIRDROPS_STATE_MODAL_IMAGE_BANNER,
	AIRDROPS_STATE_MODAL_SHARE_BUTTON
} from '$lib/constants/test-ids.constants';
import { i18n } from '$lib/stores/i18n.store';
import { mockAirdropCampaigns } from '$tests/mocks/airdrop-campaigns.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('AirdropStateModal', () => {
	const imageBannerSelector = `img[data-tid="${AIRDROPS_STATE_MODAL_IMAGE_BANNER}"]`;
	const shareSelector = `a[data-tid="${AIRDROPS_STATE_MODAL_SHARE_BUTTON}"]`;

	it('should render modal content', () => {
		const mockedAirdrop: AirdropDescription | undefined = mockAirdropCampaigns.find(
			(campaign) => campaign.id === 'OISY Airdrop #1'
		);
		assertNonNullish(mockedAirdrop);

		const { container, getByText } = render(AirdropStateModal, {
			props: {
				jackpot: false
			}
		});

		expect(getByText(get(i18n).airdrops.text.state_modal_title)).toBeInTheDocument();
		expect(getByText(get(i18n).airdrops.text.state_modal_content_text)).toBeInTheDocument();

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);
		expect(imageBanner).toBeInTheDocument();
		expect(imageBanner?.src).toContain(airdropReceived);

		const share: HTMLAnchorElement | null = container.querySelector(shareSelector);
		expect(share).toBeInTheDocument();
		expect(share?.href).toBe(mockedAirdrop.airdropHref);
	});

	it('should render modal content for jackpot', () => {
		const mockedAirdrop: AirdropDescription | undefined = mockAirdropCampaigns.find(
			(campaign) => campaign.id === 'OISY Airdrop #1'
		);
		assertNonNullish(mockedAirdrop);

		const { container, getByText } = render(AirdropStateModal, {
			props: {
				jackpot: true
			}
		});

		expect(getByText(get(i18n).airdrops.text.state_modal_title_jackpot)).toBeInTheDocument();
		expect(getByText(get(i18n).airdrops.text.state_modal_content_text)).toBeInTheDocument();

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);
		expect(imageBanner).toBeInTheDocument();
		expect(imageBanner?.src).toContain(airdropJackpotReceived);

		const share: HTMLAnchorElement | null = container.querySelector(shareSelector);
		expect(share).toBeInTheDocument();
		expect(share?.href).toBe(mockedAirdrop.jackpotHref);
	});
});
