import { SPRINKLES_SEASON_1_EPISODE_3_ID } from '$env/reward-campaigns.env';
import type { RewardCampaignDescription } from '$env/types/env-reward';
import RewardStateModal from '$lib/components/rewards/RewardStateModal.svelte';
import {
	REWARDS_STATE_MODAL_IMAGE_BANNER,
	REWARDS_STATE_MODAL_SHARE_BUTTON
} from '$lib/constants/test-ids.constants';
import { mockRewardCampaigns } from '$tests/mocks/reward-campaigns.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('RewardStateModal', () => {
	const imageBannerSelector = `img[data-tid="${REWARDS_STATE_MODAL_IMAGE_BANNER}"]`;
	const shareSelector = `a[data-tid="${REWARDS_STATE_MODAL_SHARE_BUTTON}"]`;

	it('should render modal content', () => {
		const mockedReward: RewardCampaignDescription | undefined = mockRewardCampaigns.find(
			(campaign) => campaign.id === SPRINKLES_SEASON_1_EPISODE_3_ID
		);
		assertNonNullish(mockedReward);

		const { container, getByText } = render(RewardStateModal, {
			props: {
				reward: mockedReward,
				jackpot: false
			}
		});

		expect(getByText(mockedReward.win.default.title)).toBeInTheDocument();
		expect(getByText(mockedReward.win.default.description)).toBeInTheDocument();

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

		expect(imageBanner).toBeInTheDocument();
		expect(imageBanner?.src).toContain(mockedReward.win.default.banner);

		const share: HTMLAnchorElement | null = container.querySelector(shareSelector);

		expect(share).toBeInTheDocument();
		expect(share?.href).toBe(mockedReward.win.default.shareHref);
	});

	it('should render modal content for jackpot', () => {
		const mockedReward: RewardCampaignDescription | undefined = mockRewardCampaigns.find(
			(campaign) => campaign.id === SPRINKLES_SEASON_1_EPISODE_3_ID
		);
		assertNonNullish(mockedReward);

		const { container, getByText } = render(RewardStateModal, {
			props: {
				reward: mockedReward,
				jackpot: true
			}
		});

		expect(getByText(mockedReward.win.jackpot.title)).toBeInTheDocument();
		expect(getByText(mockedReward.win.jackpot.description)).toBeInTheDocument();

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

		expect(imageBanner).toBeInTheDocument();
		expect(imageBanner?.src).toContain(mockedReward.win.jackpot.banner);

		const share: HTMLAnchorElement | null = container.querySelector(shareSelector);

		expect(share).toBeInTheDocument();
		expect(share?.href).toBe(mockedReward.win.jackpot.shareHref);
	});
});
