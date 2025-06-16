import type { RewardInfo, UserData } from '$declarations/rewards/rewards.did';
import * as rewardCampaigns from '$env/reward-campaigns.env';
import { SPRINKLES_SEASON_1_EPISODE_3_ID } from '$env/reward-campaigns.env';
import type { RewardCampaignDescription } from '$env/types/env-reward';
import * as rewardApi from '$lib/api/reward.api';
import RewardGuard from '$lib/components/guard/RewardGuard.svelte';
import { TRACK_REWARD_CAMPAIGN_WIN } from '$lib/constants/analytics.contants';
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

		vi.spyOn(rewardCampaigns, 'rewardCampaigns', 'get').mockImplementation(
			() => mockRewardCampaigns
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

	it('should open reward state modal for jackpot', async () => {
		const customMockedReward: RewardInfo = { ...mockedReward, name: ['jackpot'] };
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
				data: { reward: mockRewardCampaign, jackpot: true },
				type: 'reward-state'
			});

			expect(trackEvent).toHaveBeenNthCalledWith(1, {
				name: TRACK_REWARD_CAMPAIGN_WIN,
				metadata: {
					campaignId: mockRewardCampaign.id,
					type: 'jackpot'
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
				data: { reward: mockRewardCampaign, jackpot: false },
				type: 'reward-state'
			});

			expect(trackEvent).toHaveBeenNthCalledWith(1, {
				name: TRACK_REWARD_CAMPAIGN_WIN,
				metadata: {
					campaignId: mockRewardCampaign.id,
					type: 'airdrop'
				}
			});
		});
	});

	it('should open reward state modal for referral', async () => {
		const customMockedReward: RewardInfo = { ...mockedReward, name: ['referral'] };
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
				data: mockRewardCampaign,
				type: 'referral-state'
			});

			expect(trackEvent).toHaveBeenNthCalledWith(1, {
				name: TRACK_REWARD_CAMPAIGN_WIN,
				metadata: {
					campaignId: mockRewardCampaign.id,
					type: 'referral'
				}
			});
		});
	});
});
