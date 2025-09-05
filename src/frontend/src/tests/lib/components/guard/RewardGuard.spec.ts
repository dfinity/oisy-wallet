import type { RewardInfo, UserData } from '$declarations/rewards/rewards.did';
import * as rewardCampaigns from '$env/reward-campaigns.env';
import {
	SPRINKLES_SEASON_1_EPISODE_3_ID,
	SPRINKLES_SEASON_1_EPISODE_4_ID
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
import { mockRewardCampaigns } from '$tests/mocks/reward-campaigns.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('RewardGuard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		modalStore.close();

		vi.spyOn(rewardCampaigns, 'rewardCampaigns', 'get').mockImplementation(() =>
			mockRewardCampaigns.map((campaign) => {
				if (campaign.id === SPRINKLES_SEASON_1_EPISODE_4_ID) {
					return {
						...campaign,
						startDate: new Date('2025-02-05T14:28:02.288Z')
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
		campaign_name: ['deuteronomy'], // Note: This is no longer optional and will be superceded by campaign_id.
		campaign_id: SPRINKLES_SEASON_1_EPISODE_3_ID
	};

	const mockRewardCampaign: RewardCampaignDescription | undefined = mockRewardCampaigns.find(
		({ id }) => id === SPRINKLES_SEASON_1_EPISODE_3_ID
	);
	assertNonNullish(mockRewardCampaign);

	vi.mock('$lib/services/analytics.services', () => ({
		trackEvent: vi.fn()
	}));

	it('should open reward state modal for leaderboard', async () => {
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

	it('should open reward state modal for jackpot', async () => {
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

	it('should open reward state modal for referrer', async () => {
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

	it('should open reward state modal for referee', async () => {
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

	it('should open reward state modal for referral', async () => {
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

	it('should open reward state modal for normal airdrop', async () => {
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

	it('should open welcome modal', async () => {
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

	it('should not open welcome modal if another modal is already opened', async () => {
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
