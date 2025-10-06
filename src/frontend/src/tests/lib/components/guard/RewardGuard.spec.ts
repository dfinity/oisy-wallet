import type { RewardInfo, UserData } from '$declarations/rewards/rewards.did';
import * as rewardCampaignsEnv from '$env/reward-campaigns.env';
import {
	SPRINKLES_SEASON_1_EPISODE_3_ID,
	SPRINKLES_SEASON_1_EPISODE_4_ID,
	SPRINKLES_SEASON_1_EPISODE_5_ID,
	rewardCampaigns
} from '$env/reward-campaigns.env';
import type { RewardCampaignDescription } from '$env/types/env-reward';
import * as rewardApi from '$lib/api/reward.api';
import RewardGuard from '$lib/components/guard/RewardGuard.svelte';
import { TRACK_REWARD_CAMPAIGN_WIN, TRACK_WELCOME_OPEN } from '$lib/constants/analytics.contants';
import { RewardType } from '$lib/enums/reward-type';
import { trackEvent } from '$lib/services/analytics.services';
import { modalStore } from '$lib/stores/modal.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('RewardGuard', () => {
	const now = new Date();
	const mockStartDateEarlier = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
	const mockStartDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
	const mockEndDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

	const originalRewardCampaigns = rewardCampaignsEnv.rewardCampaigns;

	beforeEach(() => {
		vi.clearAllMocks();
		modalStore.close();

		vi.spyOn(rewardCampaignsEnv, 'rewardCampaigns', 'get').mockImplementation(() =>
			originalRewardCampaigns.map((campaign) => {
				if (campaign.id === SPRINKLES_SEASON_1_EPISODE_4_ID) {
					return {
						...campaign,
						startDate: mockStartDate,
						endDate: mockEndDate
					};
				}
				if (campaign.id === SPRINKLES_SEASON_1_EPISODE_5_ID) {
					return {
						...campaign,
						startDate: mockStartDateEarlier,
						endDate: mockEndDate
					};
				}
				return campaign;
			})
		);

		sessionStorage.clear();
		mockAuthStore();
	});

	const lastTimestamp = BigInt(Date.now());
	const mockedReward: RewardInfo = {
		timestamp: lastTimestamp,
		amount: 1000000n,
		ledger: mockIdentity.getPrincipal(),
		name: ['airdrop'],
		campaign_name: ['deuteronomy'], // Note: This is no longer optional and will be superseded by campaign_id.
		campaign_id: SPRINKLES_SEASON_1_EPISODE_3_ID
	};

	const mockRewardCampaign: RewardCampaignDescription | undefined = rewardCampaigns.find(
		({ id }) => id === SPRINKLES_SEASON_1_EPISODE_3_ID
	);
	assertNonNullish(mockRewardCampaign);

	vi.mock('$lib/services/analytics.services', () => ({
		trackEvent: vi.fn()
	}));

	describe('reward state modal', () => {
		it('should open for leaderboard', async () => {
			const customMockedReward: RewardInfo = { ...mockedReward, name: [RewardType.LEADERBOARD] };
			const mockedUserData: UserData = {
				is_vip: [false],
				superpowers: [],
				airdrops: [],
				usage_awards: [[mockedReward, customMockedReward]],
				last_snapshot_timestamp: [lastTimestamp],
				sprinkles: []
			};
			vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockedUserData);

			render(RewardGuard);

			await waitFor(() => {
				expect(get(modalStore)).toEqual({
					id: get(modalStore)?.id,
					data: { reward: mockRewardCampaign, rewardType: RewardType.LEADERBOARD },
					type: 'reward-state'
				});

				expect(trackEvent).toHaveBeenNthCalledWith(1, {
					name: TRACK_REWARD_CAMPAIGN_WIN,
					metadata: {
						campaignId: mockRewardCampaign.id,
						type: RewardType.LEADERBOARD
					}
				});
			});
		});

		it('should open for jackpot', async () => {
			const customMockedReward: RewardInfo = { ...mockedReward, name: [RewardType.JACKPOT] };
			const mockedUserData: UserData = {
				is_vip: [false],
				superpowers: [],
				airdrops: [],
				usage_awards: [[mockedReward, customMockedReward]],
				last_snapshot_timestamp: [lastTimestamp],
				sprinkles: []
			};
			vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockedUserData);

			render(RewardGuard);

			await waitFor(() => {
				expect(get(modalStore)).toEqual({
					id: get(modalStore)?.id,
					data: { reward: mockRewardCampaign, rewardType: RewardType.JACKPOT },
					type: 'reward-state'
				});

				expect(trackEvent).toHaveBeenNthCalledWith(1, {
					name: TRACK_REWARD_CAMPAIGN_WIN,
					metadata: {
						campaignId: mockRewardCampaign.id,
						type: RewardType.JACKPOT
					}
				});
			});
		});

		it('should open for referrer', async () => {
			const customMockedReward: RewardInfo = { ...mockedReward, name: [RewardType.REFERRER] };
			const mockedUserData: UserData = {
				is_vip: [false],
				superpowers: [],
				airdrops: [],
				usage_awards: [[mockedReward, customMockedReward]],
				last_snapshot_timestamp: [lastTimestamp],
				sprinkles: []
			};
			vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockedUserData);

			render(RewardGuard);

			await waitFor(() => {
				expect(get(modalStore)).toEqual({
					id: get(modalStore)?.id,
					data: { reward: mockRewardCampaign, rewardType: RewardType.REFERRER },
					type: 'reward-state'
				});

				expect(trackEvent).toHaveBeenNthCalledWith(1, {
					name: TRACK_REWARD_CAMPAIGN_WIN,
					metadata: {
						campaignId: mockRewardCampaign.id,
						type: RewardType.REFERRER
					}
				});
			});
		});

		it('should open for referee', async () => {
			const customMockedReward: RewardInfo = { ...mockedReward, name: [RewardType.REFEREE] };
			const mockedUserData: UserData = {
				is_vip: [false],
				superpowers: [],
				airdrops: [],
				usage_awards: [[mockedReward, customMockedReward]],
				last_snapshot_timestamp: [lastTimestamp],
				sprinkles: []
			};
			vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockedUserData);

			render(RewardGuard);

			await waitFor(() => {
				expect(get(modalStore)).toEqual({
					id: get(modalStore)?.id,
					data: { reward: mockRewardCampaign, rewardType: RewardType.REFEREE },
					type: 'reward-state'
				});

				expect(trackEvent).toHaveBeenNthCalledWith(1, {
					name: TRACK_REWARD_CAMPAIGN_WIN,
					metadata: {
						campaignId: mockRewardCampaign.id,
						type: RewardType.REFEREE
					}
				});
			});
		});

		it('should open for referral', async () => {
			const customMockedReward: RewardInfo = { ...mockedReward, name: [RewardType.REFERRAL] };
			const mockedUserData: UserData = {
				is_vip: [false],
				superpowers: [],
				airdrops: [],
				usage_awards: [[mockedReward, customMockedReward]],
				last_snapshot_timestamp: [lastTimestamp],
				sprinkles: []
			};
			vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockedUserData);

			render(RewardGuard);

			await waitFor(() => {
				expect(get(modalStore)).toEqual({
					id: get(modalStore)?.id,
					data: { reward: mockRewardCampaign, rewardType: RewardType.REFERRAL },
					type: 'reward-state'
				});

				expect(trackEvent).toHaveBeenNthCalledWith(1, {
					name: TRACK_REWARD_CAMPAIGN_WIN,
					metadata: {
						campaignId: mockRewardCampaign.id,
						type: RewardType.REFERRAL
					}
				});
			});
		});

		it('should open for normal airdrop', async () => {
			const mockedUserData: UserData = {
				is_vip: [false],
				superpowers: [],
				airdrops: [],
				usage_awards: [[mockedReward]],
				last_snapshot_timestamp: [lastTimestamp],
				sprinkles: []
			};
			vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockedUserData);

			render(RewardGuard);

			await waitFor(() => {
				expect(get(modalStore)).toEqual({
					id: get(modalStore)?.id,
					data: { reward: mockRewardCampaign, rewardType: RewardType.AIRDROP },
					type: 'reward-state'
				});

				expect(trackEvent).toHaveBeenNthCalledWith(1, {
					name: TRACK_REWARD_CAMPAIGN_WIN,
					metadata: {
						campaignId: mockRewardCampaign.id,
						type: RewardType.AIRDROP
					}
				});
			});
		});
	});

	describe('welcome modal', () => {
		it('should open with the most recent ongoing campaign', async () => {
			const expectedRewardCampaign: RewardCampaignDescription | undefined = rewardCampaigns.find(
				({ id }) => id === SPRINKLES_SEASON_1_EPISODE_4_ID
			);

			const mockedUserData: UserData = {
				is_vip: [false],
				superpowers: [],
				airdrops: [],
				usage_awards: [],
				last_snapshot_timestamp: [0n],
				sprinkles: []
			};
			vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockedUserData);

			render(RewardGuard);

			await waitFor(() => {
				expect(get(modalStore)).toEqual({
					id: get(modalStore)?.id,
					data: {
						reward: { ...expectedRewardCampaign, startDate: mockStartDate, endDate: mockEndDate }
					},
					type: 'welcome'
				});

				expect(trackEvent).toHaveBeenNthCalledWith(1, {
					name: TRACK_WELCOME_OPEN,
					metadata: {
						campaignId: SPRINKLES_SEASON_1_EPISODE_4_ID
					}
				});
			});
		});

		it('should open with the alphabetically-first ongoing campaign', async () => {
			vi.spyOn(rewardCampaignsEnv, 'rewardCampaigns', 'get').mockImplementation(() =>
				originalRewardCampaigns.map((campaign) => {
					if (campaign.id === SPRINKLES_SEASON_1_EPISODE_4_ID) {
						return {
							...campaign,
							startDate: mockStartDate,
							endDate: mockEndDate
						};
					}
					if (campaign.id === SPRINKLES_SEASON_1_EPISODE_5_ID) {
						return {
							...campaign,
							startDate: mockStartDate,
							endDate: mockEndDate
						};
					}
					return campaign;
				})
			);

			const expectedRewardCampaign: RewardCampaignDescription | undefined = rewardCampaigns.find(
				({ id }) => id === SPRINKLES_SEASON_1_EPISODE_5_ID
			);

			const mockedUserData: UserData = {
				is_vip: [false],
				superpowers: [],
				airdrops: [],
				usage_awards: [],
				last_snapshot_timestamp: [0n],
				sprinkles: []
			};
			vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockedUserData);

			render(RewardGuard);

			await waitFor(() => {
				expect(get(modalStore)).toEqual({
					id: get(modalStore)?.id,
					data: {
						reward: { ...expectedRewardCampaign, startDate: mockStartDate, endDate: mockEndDate }
					},
					type: 'welcome'
				});

				expect(trackEvent).toHaveBeenNthCalledWith(1, {
					name: TRACK_WELCOME_OPEN,
					metadata: {
						campaignId: SPRINKLES_SEASON_1_EPISODE_5_ID
					}
				});
			});
		});

		it('should not open if there are no modal text', async () => {
			vi.spyOn(rewardCampaignsEnv, 'rewardCampaigns', 'get').mockImplementation(() =>
				originalRewardCampaigns.map((campaign) => {
					if (campaign.id === SPRINKLES_SEASON_1_EPISODE_5_ID) {
						return {
							...campaign,
							startDate: mockStartDate,
							endDate: mockEndDate,
							welcome: undefined
						};
					}
					return campaign;
				})
			);

			const mockedUserData: UserData = {
				is_vip: [false],
				superpowers: [],
				airdrops: [],
				usage_awards: [[mockedReward]],
				last_snapshot_timestamp: [0n],
				sprinkles: []
			};
			vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockedUserData);

			render(RewardGuard);

			await waitFor(() => {
				expect(get(modalStore)).not.toEqual({
					id: get(modalStore)?.id,
					type: 'welcome'
				});
			});
		});

		it('should not open if another modal is already opened', async () => {
			const mockedUserData: UserData = {
				is_vip: [false],
				superpowers: [],
				airdrops: [],
				usage_awards: [[mockedReward]],
				last_snapshot_timestamp: [0n],
				sprinkles: []
			};
			vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockedUserData);

			render(RewardGuard);

			await waitFor(() => {
				expect(get(modalStore)).not.toEqual({
					id: get(modalStore)?.id,
					type: 'welcome'
				});
			});
		});
	});
});
