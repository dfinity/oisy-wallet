import type {
	ClaimVipRewardResponse,
	NewVipRewardResponse,
	RewardInfo,
	UserData
} from '$declarations/rewards/rewards.did';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import * as rewardApi from '$lib/api/reward.api';
import {
	claimVipReward,
	getAirdrops,
	getNewReward,
	getUserRewardsTokenAmounts,
	isVipUser
} from '$lib/services/reward-code.services';
import { i18n } from '$lib/stores/i18n.store';
import * as toastsStore from '$lib/stores/toasts.store';
import type { AirdropInfo } from '$lib/types/airdrop';
import { AlreadyClaimedError, InvalidCodeError } from '$lib/types/errors';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { get } from 'svelte/store';

const nullishIdentityErrorMessage = en.auth.error.no_internet_identity;

describe('reward-code', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	describe('isVip', () => {
		const mockedUserData: UserData = {
			is_vip: [true],
			airdrops: [],
			usage_awards: [],
			last_snapshot_timestamp: [BigInt(Date.now())],
			sprinkles: []
		};

		it('should return true if user is vip', async () => {
			const getUserInfoSpy = vi
				.spyOn(rewardApi, 'getUserInfo')
				.mockResolvedValueOnce(mockedUserData);

			const result = await isVipUser({ identity: mockIdentity });

			expect(getUserInfoSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				certified: false,
				nullishIdentityErrorMessage
			});
			expect(result).toEqual({ success: true });
		});

		it('should return false if user is not vip', async () => {
			const userData: UserData = { ...mockedUserData, is_vip: [false] };
			const getUserInfoSpy = vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValueOnce(userData);

			const result = await isVipUser({ identity: mockIdentity });

			expect(getUserInfoSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				certified: false,
				nullishIdentityErrorMessage
			});
			expect(result).toEqual({ success: false });
		});
	});

	describe('getNewReward', () => {
		const mockedNewRewardResponse: NewVipRewardResponse = {
			VipReward: {
				code: '1234567890'
			}
		};

		it('should get a vip reward code for vip user', async () => {
			const getNewVipRewardSpy = vi
				.spyOn(rewardApi, 'getNewVipReward')
				.mockResolvedValue(mockedNewRewardResponse);

			const vipReward = await getNewReward(mockIdentity);

			expect(getNewVipRewardSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				nullishIdentityErrorMessage
			});
			expect(vipReward).toEqual(mockedNewRewardResponse.VipReward);
		});

		it('should display an error message for non vip user', async () => {
			const err = new Error('test');
			const getNewVipRewardSpy = vi.spyOn(rewardApi, 'getNewVipReward').mockRejectedValue(err);
			const spyToastsError = vi.spyOn(toastsStore, 'toastsError');

			await getNewReward(mockIdentity);

			expect(getNewVipRewardSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				nullishIdentityErrorMessage
			});
			expect(spyToastsError).toHaveBeenNthCalledWith(1, {
				msg: { text: get(i18n).vip.reward.error.loading_reward },
				err
			});
		});
	});

	describe('claimVipReward', () => {
		const mockedClaimRewardResponse: ClaimVipRewardResponse = {
			Success: null
		};

		it('should return true if a valid vip reward code is used', async () => {
			const claimRewardSpy = vi
				.spyOn(rewardApi, 'claimVipReward')
				.mockResolvedValue(mockedClaimRewardResponse);

			const result = await claimVipReward({ identity: mockIdentity, code: '1234567890' });

			expect(claimRewardSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				vipReward: { code: '1234567890' },
				nullishIdentityErrorMessage
			});
			expect(result).toEqual({ success: true });
		});

		it('should return false if an invalid vip reward code is used', async () => {
			const claimRewardResponse: ClaimVipRewardResponse = { InvalidCode: null };
			const claimRewardSpy = vi
				.spyOn(rewardApi, 'claimVipReward')
				.mockResolvedValue(claimRewardResponse);

			const result = await claimVipReward({ identity: mockIdentity, code: '1234567890' });

			expect(claimRewardSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				vipReward: { code: '1234567890' },
				nullishIdentityErrorMessage
			});
			expect(result.success).toBeFalsy();
			expect(result.err).not.toBeUndefined();
			expect(result.err).toBeInstanceOf(InvalidCodeError);
		});

		it('should return false if an already used vip reward code is used', async () => {
			const claimRewardResponse: ClaimVipRewardResponse = { AlreadyClaimed: null };
			const claimRewardSpy = vi
				.spyOn(rewardApi, 'claimVipReward')
				.mockResolvedValue(claimRewardResponse);

			const result = await claimVipReward({ identity: mockIdentity, code: '1234567890' });

			expect(claimRewardSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				vipReward: { code: '1234567890' },
				nullishIdentityErrorMessage
			});
			expect(result.success).toBeFalsy();
			expect(result.err).not.toBeUndefined();
			expect(result.err).toBeInstanceOf(AlreadyClaimedError);
		});
	});

	describe('getAirdrops', () => {
		const lastTimestamp = BigInt(Date.now());

		const mockedAirdrop: RewardInfo = {
			timestamp: lastTimestamp,
			amount: BigInt(1000000),
			ledger: mockIdentity.getPrincipal(),
			name: ['jackpot']
		};
		const mockedUserData: UserData = {
			is_vip: [false],
			airdrops: [],
			usage_awards: [[mockedAirdrop]],
			last_snapshot_timestamp: [lastTimestamp],
			sprinkles: []
		};
		const expectedAirdrop: AirdropInfo = {
			timestamp: lastTimestamp,
			amount: BigInt(1000000),
			ledger: mockIdentity.getPrincipal(),
			name: 'jackpot'
		};

		it('should return a list of airdrops and the last timestamp', async () => {
			const getUserInfoSpy = vi
				.spyOn(rewardApi, 'getUserInfo')
				.mockResolvedValueOnce(mockedUserData);

			const result = await getAirdrops({ identity: mockIdentity });

			expect(getUserInfoSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				certified: false,
				nullishIdentityErrorMessage
			});

			expect(result).toEqual({ airdrops: [expectedAirdrop], lastTimestamp });
		});
	});

	const mockCkBtcToken = {
		...ICP_TOKEN,
		symbol: 'ckBTC',
		ledgerCanisterId: 'ckbtcLedgerCanisterId'
	};
	const mockCkUsdcToken = {
		...ICP_TOKEN,
		symbol: 'ckUSDC',
		ledgerCanisterId: 'ckusdcLedgerCanisterId'
	};
	const mockIcpToken = { ...ICP_TOKEN, ledgerCanisterId: 'icpLedgerCanisterId' };

	const getMockReward = ({
		ledgerCanisterId,
		amount
	}: {
		ledgerCanisterId: unknown;
		amount: bigint;
	}): RewardInfo =>
		({
			ledger: { toText: () => ledgerCanisterId },
			amount: amount
		}) as unknown as RewardInfo;

	const baseMockUserData = {
		usage_awards: [],
		airdrops: [],
		last_snapshot_timestamp: undefined,
		is_vip: false,
		sprinkles: []
	} as unknown as UserData;

	describe('getUserRewardsTokenAmounts', () => {
		vi.spyOn(rewardApi, 'getUserInfo')
			.mockResolvedValueOnce({
				...baseMockUserData,
				usage_awards: [
					[
						getMockReward({ ledgerCanisterId: mockCkBtcToken.ledgerCanisterId, amount: 1000n }),
						getMockReward({ ledgerCanisterId: mockCkBtcToken.ledgerCanisterId, amount: 1000n }),
						getMockReward({ ledgerCanisterId: mockCkBtcToken.ledgerCanisterId, amount: 1000n }),
						getMockReward({ ledgerCanisterId: mockCkUsdcToken.ledgerCanisterId, amount: 2000n }),
						getMockReward({ ledgerCanisterId: mockCkUsdcToken.ledgerCanisterId, amount: 2000n }),
						getMockReward({ ledgerCanisterId: mockIcpToken.ledgerCanisterId, amount: 3000n })
					]
				]
			})
			.mockResolvedValueOnce({
				...baseMockUserData,
				usage_awards: [
					[
						getMockReward({ ledgerCanisterId: null, amount: 1000n }),
						getMockReward({ ledgerCanisterId: 'invalid', amount: 1000n }),
						getMockReward({ ledgerCanisterId: undefined, amount: 1000n }),
						getMockReward({ ledgerCanisterId: mockCkBtcToken.ledgerCanisterId, amount: 1000n })
					]
				]
			})
			.mockResolvedValueOnce({
				...baseMockUserData,
				usage_awards: [
					[
						getMockReward({ ledgerCanisterId: null, amount: 1000n }),
						getMockReward({ ledgerCanisterId: 'invalid', amount: 1000n }),
						getMockReward({ ledgerCanisterId: undefined, amount: 1000n }),
						getMockReward({ ledgerCanisterId: mockCkBtcToken.ledgerCanisterId, amount: 0n }),
						getMockReward({ ledgerCanisterId: mockCkUsdcToken.ledgerCanisterId, amount: 0n }),
						getMockReward({ ledgerCanisterId: mockIcpToken.ledgerCanisterId, amount: 0n })
					]
				]
			});

		it('should calculate correct sums for all rewards', async () => {
			const result = await getUserRewardsTokenAmounts({
				ckBtcToken: mockCkBtcToken,
				ckUsdcToken: mockCkUsdcToken,
				icpToken: mockIcpToken,
				identity: mockIdentity
			});
			expect(result.ckBtcReward.toString()).toEqual('3000');
			expect(result.ckUsdcReward.toString()).toEqual('4000');
			expect(result.icpReward.toString()).toEqual('3000');
		});

		it('should ignore invalid canister ids', async () => {
			const result = await getUserRewardsTokenAmounts({
				ckBtcToken: mockCkBtcToken,
				ckUsdcToken: mockCkUsdcToken,
				icpToken: mockIcpToken,
				identity: mockIdentity
			});
			expect(result.ckBtcReward.toString()).toEqual('1000');
			expect(result.ckUsdcReward.toString()).toEqual('0');
			expect(result.icpReward.toString()).toEqual('0');
		});

		it('should ignore invalid canister ids but still return values', async () => {
			const result = await getUserRewardsTokenAmounts({
				ckBtcToken: mockCkBtcToken,
				ckUsdcToken: mockCkUsdcToken,
				icpToken: mockIcpToken,
				identity: mockIdentity
			});
			expect(result.ckBtcReward.toString()).toEqual('0');
			expect(result.ckUsdcReward.toString()).toEqual('0');
			expect(result.icpReward.toString()).toEqual('0');
		});
	});
});
