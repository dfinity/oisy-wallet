import {
	SPRINKLES_SEASON_1_EPISODE_3_ID,
	SPRINKLES_SEASON_1_EPISODE_4_ID
} from '$env/reward-campaigns.env';
import type { RewardCampaignDescription } from '$env/types/env-reward';
import RewardStateModal from '$lib/components/rewards/RewardStateModal.svelte';
import { OISY_REWARDS_URL } from '$lib/constants/oisy.constants';
import {
	REWARDS_STATE_MODAL_IMAGE_BANNER,
	REWARDS_STATE_MODAL_LEARN_MORE_ANCHOR,
	REWARDS_STATE_MODAL_SHARE_BUTTON
} from '$lib/constants/test-ids.constants';
import { RewardType } from '$lib/enums/reward-type';
import { mockRewardCampaigns } from '$tests/mocks/reward-campaigns.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('RewardStateModal', () => {
	const imageBannerSelector = `img[data-tid="${REWARDS_STATE_MODAL_IMAGE_BANNER}"]`;
	const learnMoreSelector = `a[data-tid="${REWARDS_STATE_MODAL_LEARN_MORE_ANCHOR}"]`;
	const shareSelector = `a[data-tid="${REWARDS_STATE_MODAL_SHARE_BUTTON}"]`;

	it('should render modal content', () => {
		const mockedReward: RewardCampaignDescription | undefined = mockRewardCampaigns.find(
			(campaign) => campaign.id === SPRINKLES_SEASON_1_EPISODE_3_ID
		);
		assertNonNullish(mockedReward);

		const { container, getByText } = render(RewardStateModal, {
			props: {
				reward: mockedReward,
				rewardType: RewardType.AIRDROP
			}
		});

		expect(getByText(mockedReward.win.default.title)).toBeInTheDocument();
		expect(getByText(mockedReward.win.default.description)).toBeInTheDocument();

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

		expect(imageBanner).toBeInTheDocument();
		expect(imageBanner?.src).toContain(mockedReward.win.default.banner);

		const learnMore: HTMLAnchorElement | null = container.querySelector(learnMoreSelector);

		expect(learnMore).toBeInTheDocument();
		expect(learnMore?.href).toBe(OISY_REWARDS_URL);

		const share: HTMLAnchorElement | null = container.querySelector(shareSelector);

		expect(share).toBeInTheDocument();
		expect(share?.href).toBe(mockedReward.win.default.shareHref);
	});

	it('should render modal content for referrer', () => {
		const mockedReward: RewardCampaignDescription | undefined = mockRewardCampaigns.find(
			(campaign) => campaign.id === SPRINKLES_SEASON_1_EPISODE_4_ID
		);
		assertNonNullish(mockedReward);

		const { container, getByText } = render(RewardStateModal, {
			props: {
				reward: mockedReward,
				rewardType: RewardType.REFERRER
			}
		});

		expect(getByText(mockedReward.win.referrer?.title ?? '')).toBeInTheDocument();
		expect(getByText(mockedReward.win.referrer?.description ?? '')).toBeInTheDocument();

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

		expect(imageBanner).toBeInTheDocument();
		expect(imageBanner?.src).toContain(mockedReward.win.referrer?.banner ?? '');

		const learnMore: HTMLAnchorElement | null = container.querySelector(learnMoreSelector);

		expect(learnMore).toBeInTheDocument();
		expect(learnMore?.href).toBe(OISY_REWARDS_URL);

		const share: HTMLAnchorElement | null = container.querySelector(shareSelector);

		expect(share).toBeInTheDocument();
		expect(share?.href).toBe(mockedReward.win.referrer?.shareHref ?? '');
	});

	it('should render modal content for referral', () => {
		const mockedReward: RewardCampaignDescription | undefined = mockRewardCampaigns.find(
			(campaign) => campaign.id === SPRINKLES_SEASON_1_EPISODE_3_ID
		);
		assertNonNullish(mockedReward);

		const { container, getByText } = render(RewardStateModal, {
			props: {
				reward: mockedReward,
				rewardType: RewardType.REFERRAL
			}
		});

		expect(getByText(mockedReward.win.referral?.title ?? '')).toBeInTheDocument();
		expect(getByText(mockedReward.win.referral?.description ?? '')).toBeInTheDocument();

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

		expect(imageBanner).toBeInTheDocument();
		expect(imageBanner?.src).toContain(mockedReward.win.referral?.banner ?? '');

		const learnMore: HTMLAnchorElement | null = container.querySelector(learnMoreSelector);

		expect(learnMore).toBeInTheDocument();
		expect(learnMore?.href).toBe(OISY_REWARDS_URL);

		const share: HTMLAnchorElement | null = container.querySelector(shareSelector);

		expect(share).toBeInTheDocument();
		expect(share?.href).toBe(mockedReward.win.referral?.shareHref ?? '');
	});

	it('should render modal content for referee', () => {
		const mockedReward: RewardCampaignDescription | undefined = mockRewardCampaigns.find(
			(campaign) => campaign.id === SPRINKLES_SEASON_1_EPISODE_4_ID
		);
		assertNonNullish(mockedReward);

		const { container, getByText } = render(RewardStateModal, {
			props: {
				reward: mockedReward,
				rewardType: RewardType.REFEREE
			}
		});

		expect(getByText(mockedReward.win.referee?.title ?? '')).toBeInTheDocument();
		expect(getByText(mockedReward.win.referee?.description ?? '')).toBeInTheDocument();

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

		expect(imageBanner).toBeInTheDocument();
		expect(imageBanner?.src).toContain(mockedReward.win.referee?.banner ?? '');

		const learnMore: HTMLAnchorElement | null = container.querySelector(learnMoreSelector);

		expect(learnMore).toBeInTheDocument();
		expect(learnMore?.href).toBe(OISY_REWARDS_URL);

		const share: HTMLAnchorElement | null = container.querySelector(shareSelector);

		expect(share).toBeInTheDocument();
		expect(share?.href).toBe(mockedReward.win.referee?.shareHref ?? '');
	});

	it('should render modal content for jackpot', () => {
		const mockedReward: RewardCampaignDescription | undefined = mockRewardCampaigns.find(
			(campaign) => campaign.id === SPRINKLES_SEASON_1_EPISODE_3_ID
		);
		assertNonNullish(mockedReward);

		const { container, getByText } = render(RewardStateModal, {
			props: {
				reward: mockedReward,
				rewardType: RewardType.JACKPOT
			}
		});

		expect(getByText(mockedReward.win.jackpot.title)).toBeInTheDocument();
		expect(getByText(mockedReward.win.jackpot.description)).toBeInTheDocument();

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

		expect(imageBanner).toBeInTheDocument();
		expect(imageBanner?.src).toContain(mockedReward.win.jackpot.banner);

		const learnMore: HTMLAnchorElement | null = container.querySelector(learnMoreSelector);

		expect(learnMore).toBeInTheDocument();
		expect(learnMore?.href).toBe(OISY_REWARDS_URL);

		const share: HTMLAnchorElement | null = container.querySelector(shareSelector);

		expect(share).toBeInTheDocument();
		expect(share?.href).toBe(mockedReward.win.jackpot.shareHref);
	});

	it('should render modal content for leaderboard', () => {
		const mockedReward: RewardCampaignDescription | undefined = mockRewardCampaigns.find(
			(campaign) => campaign.id === SPRINKLES_SEASON_1_EPISODE_4_ID
		);
		assertNonNullish(mockedReward);

		const { container, getByText } = render(RewardStateModal, {
			props: {
				reward: mockedReward,
				rewardType: RewardType.LEADERBOARD
			}
		});

		expect(getByText(mockedReward.win.leaderboard?.title ?? '')).toBeInTheDocument();
		expect(getByText(mockedReward.win.leaderboard?.description ?? '')).toBeInTheDocument();

		const imageBanner: HTMLImageElement | null = container.querySelector(imageBannerSelector);

		expect(imageBanner).toBeInTheDocument();
		expect(imageBanner?.src).toContain(mockedReward.win.leaderboard?.banner ?? '');

		const learnMore: HTMLAnchorElement | null = container.querySelector(learnMoreSelector);

		expect(learnMore).toBeInTheDocument();
		expect(learnMore?.href).toBe(OISY_REWARDS_URL);

		const share: HTMLAnchorElement | null = container.querySelector(shareSelector);

		expect(share).toBeInTheDocument();
		expect(share?.href).toBe(mockedReward.win.leaderboard?.shareHref ?? '');
	});
});
