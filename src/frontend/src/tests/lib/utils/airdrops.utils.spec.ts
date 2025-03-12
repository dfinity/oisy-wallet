import type { RewardInfo, UserData } from '$declarations/rewards/rewards.did';
import * as rewardApi from '$lib/api/reward.api';
import { ZERO } from '$lib/constants/app.constants';
import {
	INITIAL_REWARD_RESULT,
	getRewardsBalance,
	isOngoingCampaign,
	isUpcomingCampaign,
	loadRewardResult
} from '$lib/utils/rewards.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { BigNumber } from '@ethersproject/bignumber';

describe('rewards utils', () => {
	describe('loadAirdropResult', () => {
		beforeEach(() => {
			sessionStorage.clear();
		});

		const lastTimestamp = BigInt(Date.now());
		const mockedAirdrop: RewardInfo = {
			timestamp: lastTimestamp,
			amount: BigInt(1000000),
			ledger: mockIdentity.getPrincipal(),
			name: ['airdrop']
		};

		it('should return falsy airdrop result if result was already loaded', async () => {
			sessionStorage.setItem(INITIAL_REWARD_RESULT, 'true');

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBe('true');

			const { receivedReward, receivedJackpot } = await loadRewardResult(mockIdentity);

			expect(receivedReward).toBe(false);
			expect(receivedJackpot).toBe(false);
		});

		it('should return falsy airdrop result and set entry in the session storage', async () => {
			const mockedUserData: UserData = {
				is_vip: [false],
				airdrops: [],
				usage_awards: [],
				last_snapshot_timestamp: [lastTimestamp],
				sprinkles: []
			};
			vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockedUserData);

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBeNull();

			const { receivedReward, receivedJackpot } = await loadRewardResult(mockIdentity);

			expect(receivedReward).toBe(false);
			expect(receivedJackpot).toBe(false);

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBe('true');
		});

		it('should return isAirdrop as true and set entry in the session storage', async () => {
			const mockedUserData: UserData = {
				is_vip: [false],
				airdrops: [],
				usage_awards: [[mockedAirdrop]],
				last_snapshot_timestamp: [lastTimestamp],
				sprinkles: []
			};
			vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockedUserData);

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBeNull();

			const { receivedReward, receivedJackpot } = await loadRewardResult(mockIdentity);

			expect(receivedReward).toBe(true);
			expect(receivedJackpot).toBe(false);

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBe('true');
		});

		it('should return isJackpot as true and set entry in the session storage', async () => {
			const customMockedAirdrop: RewardInfo = { ...mockedAirdrop, name: ['jackpot'] };
			const mockedUserData: UserData = {
				is_vip: [false],
				airdrops: [],
				usage_awards: [[customMockedAirdrop]],
				last_snapshot_timestamp: [lastTimestamp],
				sprinkles: []
			};
			vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockedUserData);

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBeNull();

			const { receivedReward, receivedJackpot } = await loadRewardResult(mockIdentity);

			expect(receivedReward).toBe(true);
			expect(receivedJackpot).toBe(true);

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBe('true');
		});

		it('should return isJackpot as true if one of several received rewards is a jackpot and set entry in the session storage', async () => {
			const customMockedAirdrop: RewardInfo = { ...mockedAirdrop, name: ['jackpot'] };
			const mockedUserData: UserData = {
				is_vip: [false],
				airdrops: [],
				usage_awards: [[mockedAirdrop, customMockedAirdrop]],
				last_snapshot_timestamp: [lastTimestamp],
				sprinkles: []
			};
			vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockedUserData);

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBeNull();

			const { receivedReward, receivedJackpot } = await loadRewardResult(mockIdentity);

			expect(receivedReward).toBe(true);
			expect(receivedJackpot).toBe(true);

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBe('true');
		});
	});

	describe('isOngoingCampaign', () => {
		it('should return true if the current date is between the start and end dates of the campaign', () => {
			const startDate = new Date(Date.now() - 86400000);
			const endDate = new Date(Date.now() + 86400000);

			const result = isOngoingCampaign({ startDate, endDate });

			expect(result).toBe(true);
		});

		it('should return false if the current date is before the start date of the campaign', () => {
			const startDate = new Date(Date.now() + 86400000);

			const result = isOngoingCampaign({ startDate, endDate: new Date() });

			expect(result).toBe(false);
		});

		it('should return false if the current date is after the end date of the campaign', () => {
			const startDate = new Date(Date.now() - 86400000);

			const result = isOngoingCampaign({ startDate, endDate: new Date() });

			expect(result).toBe(false);
		});
	});

	describe('isUpcomingCampaign', () => {
		it('should return true if the current date is before the start date of the campaign', () => {
			const startDate = new Date(Date.now() + 86400000);

			const result = isUpcomingCampaign(startDate);

			expect(result).toBe(true);
		});

		it('should return false if the current date is after the start date of the campaign', () => {
			const startDate = new Date(Date.now() - 86400000);

			const result = isUpcomingCampaign(startDate);

			expect(result).toBe(false);
		});
	});

	describe('getAirdropsBalance', () => {
		const lastTimestamp = BigInt(Date.now());

		const mockedAirdrop: RewardInfo = {
			amount: BigInt(100),
			timestamp: lastTimestamp,
			name: 'airdrop',
			ledger: mockIdentity.getPrincipal()
		};

		it('should return the correct rewards balance of multiple rewards', () => {
			const mockedAirdrops: RewardInfo[] = [
				mockedAirdrop,
				{ ...mockedAirdrop, amount: BigInt(200) },
				{ ...mockedAirdrop, amount: BigInt(300) }
			];

			const result = getRewardsBalance(mockedAirdrops);

			expect(result).toEqual(BigNumber.from(600));
		});

		it('should return the correct rewards balance of a single airdrop', () => {
			const mockedAirdrops: RewardInfo[] = [mockedAirdrop];

			const result = getRewardsBalance(mockedAirdrops);

			expect(result).toEqual(BigNumber.from(100));
		});

		it('should return zero for an empty list of rewards', () => {
			const mockedAirdrops: RewardInfo[] = [];

			const result = getRewardsBalance(mockedAirdrops);

			expect(result).toEqual(ZERO);
		});
	});
});
