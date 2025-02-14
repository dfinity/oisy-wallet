import type { RewardInfo, UserData } from '$declarations/rewards/rewards.did';
import * as rewardApi from '$lib/api/reward.api';
import { INITIAL_AIRDROP_RESULT, loadAirdropResult } from '$lib/utils/airdrops.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';

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
});
