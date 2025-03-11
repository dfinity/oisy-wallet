import type { RewardInfo, UserData } from '$declarations/rewards/rewards.did';
import * as rewardApi from '$lib/api/reward.api';
import { ZERO } from '$lib/constants/app.constants';
import type { AirdropInfo } from '$lib/types/airdrop';
import {
	INITIAL_AIRDROP_RESULT,
	getAirdropsBalance,
	isOngoingCampaign,
	isUpcomingCampaign,
	loadAirdropResult
} from '$lib/utils/airdrops.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { BigNumber } from '@ethersproject/bignumber';

describe('airdrops utils', () => {
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
			sessionStorage.setItem(INITIAL_AIRDROP_RESULT, 'true');

			expect(sessionStorage.getItem(INITIAL_AIRDROP_RESULT)).toBe('true');

			const { receivedAirdrop, receivedJackpot } = await loadAirdropResult(mockIdentity);

			expect(receivedAirdrop).toBe(false);
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

			expect(sessionStorage.getItem(INITIAL_AIRDROP_RESULT)).toBeNull();

			const { receivedAirdrop, receivedJackpot } = await loadAirdropResult(mockIdentity);

			expect(receivedAirdrop).toBe(false);
			expect(receivedJackpot).toBe(false);

			expect(sessionStorage.getItem(INITIAL_AIRDROP_RESULT)).toBe('true');
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

			expect(sessionStorage.getItem(INITIAL_AIRDROP_RESULT)).toBeNull();

			const { receivedAirdrop, receivedJackpot } = await loadAirdropResult(mockIdentity);

			expect(receivedAirdrop).toBe(true);
			expect(receivedJackpot).toBe(false);

			expect(sessionStorage.getItem(INITIAL_AIRDROP_RESULT)).toBe('true');
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

			expect(sessionStorage.getItem(INITIAL_AIRDROP_RESULT)).toBeNull();

			const { receivedAirdrop, receivedJackpot } = await loadAirdropResult(mockIdentity);

			expect(receivedAirdrop).toBe(true);
			expect(receivedJackpot).toBe(true);

			expect(sessionStorage.getItem(INITIAL_AIRDROP_RESULT)).toBe('true');
		});

		it('should return isJackpot as true if one of several received airdrops is a jackpot and set entry in the session storage', async () => {
			const customMockedAirdrop: RewardInfo = { ...mockedAirdrop, name: ['jackpot'] };
			const mockedUserData: UserData = {
				is_vip: [false],
				airdrops: [],
				usage_awards: [[mockedAirdrop, customMockedAirdrop]],
				last_snapshot_timestamp: [lastTimestamp],
				sprinkles: []
			};
			vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockedUserData);

			expect(sessionStorage.getItem(INITIAL_AIRDROP_RESULT)).toBeNull();

			const { receivedAirdrop, receivedJackpot } = await loadAirdropResult(mockIdentity);

			expect(receivedAirdrop).toBe(true);
			expect(receivedJackpot).toBe(true);

			expect(sessionStorage.getItem(INITIAL_AIRDROP_RESULT)).toBe('true');
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

		const mockedAirdrop: AirdropInfo = {
			amount: BigInt(100),
			timestamp: lastTimestamp,
			name: 'airdrop',
			ledger: mockIdentity.getPrincipal()
		};

		it('should return the correct airdrops balance of multiple airdrops', () => {
			const mockedAirdrops: AirdropInfo[] = [
				mockedAirdrop,
				{ ...mockedAirdrop, amount: BigInt(200) },
				{ ...mockedAirdrop, amount: BigInt(300) }
			];

			const result = getAirdropsBalance(mockedAirdrops);

			expect(result).toEqual(BigNumber.from(600));
		});

		it('should return the correct airdrops balance of a single airdrop', () => {
			const mockedAirdrops: AirdropInfo[] = [mockedAirdrop];

			const result = getAirdropsBalance(mockedAirdrops);

			expect(result).toEqual(BigNumber.from(100));
		});

		it('should return zero for an empty list of airdrops', () => {
			const mockedAirdrops: AirdropInfo[] = [];

			const result = getAirdropsBalance(mockedAirdrops);

			expect(result).toEqual(ZERO);
		});
	});
});
