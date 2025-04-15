import type { RewardDescription } from '$env/types/env-reward';
import rewardJackpotReceived from '$lib/assets/reward-jackpot-received.svg';
import rewardReceived from '$lib/assets/reward-received.svg';
import RewardStateModal from '$lib/components/rewards/RewardStateModal.svelte';
import {
	REWARDS_STATE_MODAL_IMAGE_BANNER,
	REWARDS_STATE_MODAL_SHARE_BUTTON
} from '$lib/constants/test-ids.constants';
import { i18n } from '$lib/stores/i18n.store';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import { mockRewardCampaigns } from '$tests/mocks/reward-campaigns.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('RewardStateModal', () => {
	const imageBannerSelector = `img[data-tid="${REWARDS_STATE_MODAL_IMAGE_BANNER}"]`;
	const shareSelector = `a[data-tid="${REWARDS_STATE_MODAL_SHARE_BUTTON}"]`;

	it('should render modal content', () => {
		const mockedReward: RewardDescription | undefined = mockRewardCampaigns.find(
			(campaign) => campaign.id === 'OISY Airdrop #1'
		);
		assertNonNullish(mockedReward);

		const { container, getByText } = render(RewardStateModal, {
			props: {
				jackpot: false
			}
		});

		expect(
			getByText(replaceOisyPlaceholders(get(i18n).rewards.text.state_modal_title))
		).toBeInTheDocument();
		expect(getByText(get(i18n).rewards.text.state_modal_content_text)).toBeInTheDocument();

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

		expect(imageBanner).toBeInTheDocument();
		expect(imageBanner?.src).toContain(rewardReceived);

		const share: HTMLAnchorElement | null = container.querySelector(shareSelector);

		expect(share).toBeInTheDocument();
		expect(share?.href).toBe(mockedReward.airdropHref);
	});

	it('should render modal content for jackpot', () => {
		const mockedReward: RewardDescription | undefined = mockRewardCampaigns.find(
			(campaign) => campaign.id === 'OISY Airdrop #1'
		);
		assertNonNullish(mockedReward);

		const { container, getByText } = render(RewardStateModal, {
			props: {
				jackpot: true
			}
		});

		expect(
			getByText(replaceOisyPlaceholders(get(i18n).rewards.text.state_modal_title_jackpot))
		).toBeInTheDocument();
		expect(getByText(get(i18n).rewards.text.state_modal_content_text)).toBeInTheDocument();

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

		expect(imageBanner).toBeInTheDocument();
		expect(imageBanner?.src).toContain(rewardJackpotReceived);

		const share: HTMLAnchorElement | null = container.querySelector(shareSelector);

		expect(share).toBeInTheDocument();
		expect(share?.href).toBe(mockedReward.jackpotHref);
	});
});
