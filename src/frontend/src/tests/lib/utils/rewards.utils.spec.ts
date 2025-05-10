import type { RewardInfo, UserData } from '$declarations/rewards/rewards.did';
import * as rewardApi from '$lib/api/reward.api';
import {
	INITIAL_REWARD_RESULT,
	isEndedCampaign,
	isOngoingCampaign,
	isUpcomingCampaign,
	loadRewardResult
} from '$lib/utils/rewards.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';

describe('rewards.utils', () => {
	describe('loadRewardResult', () => {
		beforeEach(() => {
			sessionStorage.clear();
		});

		const lastTimestamp = BigInt(Date.now());
		const mockedReward: RewardInfo = {
			timestamp: lastTimestamp,
			amount: 1000000n,
			ledger: mockIdentity.getPrincipal(),
			name: ['airdrop'],
			campaign_name: ['deuteronomy'], // Note: This is no longer optional and will be superceded by campaign_id.
			campaign_id: 'deuteronomy'
		};

		it('should return falsy reward result if result was already loaded', async () => {
			sessionStorage.setItem(INITIAL_REWARD_RESULT, 'true');

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBe('true');

			const { receivedReward, receivedJackpot, receivedReferral } =
				await loadRewardResult(mockIdentity);

			expect(receivedReward).toBeFalsy();
			expect(receivedJackpot).toBeFalsy();
			expect(receivedReferral).toBeFalsy();
		});

		it('should return falsy reward result and set entry in the session storage', async () => {
			const mockedUserData: UserData = {
				is_vip: [false],
				superpowers: [],
				airdrops: [],
				usage_awards: [],
				last_snapshot_timestamp: [lastTimestamp],
				sprinkles: []
			};
			vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockedUserData);

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBeNull();

			const { receivedReward, receivedJackpot, receivedReferral } =
				await loadRewardResult(mockIdentity);

			expect(receivedReward).toBeFalsy();
			expect(receivedJackpot).toBeFalsy();
			expect(receivedReferral).toBeFalsy();

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBe('true');
		});

		it('should return isReward as true and set entry in the session storage', async () => {
			const mockedUserData: UserData = {
				is_vip: [false],
				superpowers: [],
				airdrops: [],
				usage_awards: [[mockedReward]],
				last_snapshot_timestamp: [lastTimestamp],
				sprinkles: []
			};
			vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockedUserData);

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBeNull();

			const { receivedReward, receivedJackpot, receivedReferral } =
				await loadRewardResult(mockIdentity);

			expect(receivedReward).toBeTruthy();
			expect(receivedJackpot).toBeFalsy();
			expect(receivedReferral).toBeFalsy();

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBe('true');
		});

		it('should return isJackpot as true and set entry in the session storage', async () => {
			const customMockedReward: RewardInfo = { ...mockedReward, name: ['jackpot'] };
			const mockedUserData: UserData = {
				is_vip: [false],
				superpowers: [],
				airdrops: [],
				usage_awards: [[customMockedReward]],
				last_snapshot_timestamp: [lastTimestamp],
				sprinkles: []
			};
			vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockedUserData);

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBeNull();

			const { receivedReward, receivedJackpot, receivedReferral } =
				await loadRewardResult(mockIdentity);

			expect(receivedReward).toBeTruthy();
			expect(receivedJackpot).toBeTruthy();
			expect(receivedReferral).toBeFalsy();

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBe('true');
		});

		it('should return isJackpot as true if one of several received rewards is a jackpot and set entry in the session storage', async () => {
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

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBeNull();

			const { receivedReward, receivedJackpot, receivedReferral } =
				await loadRewardResult(mockIdentity);

			expect(receivedReward).toBeTruthy();
			expect(receivedJackpot).toBeTruthy();
			expect(receivedReferral).toBeFalsy();

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBe('true');
		});

		it('should return isReferral as true and set entry in the session storage', async () => {
			const customMockedReward: RewardInfo = { ...mockedReward, name: ['referral'] };
			const mockedUserData: UserData = {
				is_vip: [false],
				superpowers: [],
				airdrops: [],
				usage_awards: [[customMockedReward]],
				last_snapshot_timestamp: [lastTimestamp],
				sprinkles: []
			};
			vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockedUserData);

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBeNull();

			const { receivedReward, receivedJackpot, receivedReferral } =
				await loadRewardResult(mockIdentity);

			expect(receivedReward).toBeTruthy();
			expect(receivedJackpot).toBeFalsy();
			expect(receivedReferral).toBeTruthy();

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBe('true');
		});
	});

	describe('isOngoingCampaign', () => {
		it('should return true if the current date is between the start and end dates of the campaign', () => {
			const startDate = new Date(Date.now() - 86400000);
			const endDate = new Date(Date.now() + 86400000);

			const result = isOngoingCampaign({ startDate, endDate });

			expect(result).toBeTruthy();
		});

		it('should return false if the current date is before the start date of the campaign', () => {
			const startDate = new Date(Date.now() + 86400000);

			const result = isOngoingCampaign({ startDate, endDate: new Date() });

			expect(result).toBeFalsy();
		});

		it('should return false if the current date is after the end date of the campaign', () => {
			const startDate = new Date(Date.now() - 86400000);

			const result = isOngoingCampaign({ startDate, endDate: new Date() });

			expect(result).toBeFalsy();
		});
	});

	describe('isUpcomingCampaign', () => {
		it('should return true if the current date is before the start date of the campaign', () => {
			const startDate = new Date(Date.now() + 86400000);

			const result = isUpcomingCampaign(startDate);

			expect(result).toBeTruthy();
		});

		it('should return false if the current date is after the start date of the campaign', () => {
			const startDate = new Date(Date.now() - 86400000);

			const result = isUpcomingCampaign(startDate);

			expect(result).toBeFalsy();
		});
	});

	describe('isEndedCampaign', () => {
		it('should return false if the current date is before the end date of the campaign', () => {
			const endDate = new Date(Date.now() + 86400000);

			const result = isEndedCampaign(endDate);

			expect(result).toBeFalsy();
		});

		it('should return true if the current date is after the end date of the campaign', () => {
			const endDate = new Date(Date.now() - 86400000);

			const result = isEndedCampaign(endDate);

			expect(result).toBeTruthy();
		});
	});
});
