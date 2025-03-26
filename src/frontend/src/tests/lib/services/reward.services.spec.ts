import type {
	ClaimVipRewardResponse,
	NewVipRewardResponse,
	ReferrerInfo,
	RewardInfo,
	UserData
} from '$declarations/rewards/rewards.did';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import * as rewardApi from '$lib/api/reward.api';
import {
	MILLISECONDS_IN_DAY,
	NANO_SECONDS_IN_MILLISECOND,
	ZERO_BI
} from '$lib/constants/app.constants';
import {
	claimVipReward,
	getNewReward,
	getReferrerInfo,
	getRewardRequirementsFulfilled,
	getRewards,
	getUserRewardsTokenAmounts,
	isVipUser,
	setReferrer
} from '$lib/services/reward.services';
import { i18n } from '$lib/stores/i18n.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { AlreadyClaimedError, InvalidCodeError } from '$lib/types/errors';
import type { RewardResponseInfo } from '$lib/types/reward';
import type { AnyTransactionUiWithCmp } from '$lib/types/transaction';
import { mockBtcTransactionUi } from '$tests/mocks/btc-transactions.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { get } from 'svelte/store';

const nullishIdentityErrorMessage = en.auth.error.no_internet_identity;

describe('reward-code', () => {
	beforeEach(() => {
		vi.clearAllMocks();
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

	describe('getRewards', () => {
		const lastTimestamp = BigInt(Date.now());

		const mockedReward: RewardInfo = {
			timestamp: lastTimestamp,
			amount: 1000000n,
			ledger: mockIdentity.getPrincipal(),
			name: ['jackpot']
		};
		const mockedUserData: UserData = {
			is_vip: [false],
			airdrops: [],
			usage_awards: [[mockedReward]],
			last_snapshot_timestamp: [lastTimestamp],
			sprinkles: []
		};
		const expectedReward: RewardResponseInfo = {
			timestamp: lastTimestamp,
			amount: 1000000n,
			ledger: mockIdentity.getPrincipal(),
			name: 'jackpot'
		};

		it('should return a list of rewards and the last timestamp', async () => {
			const getUserInfoSpy = vi
				.spyOn(rewardApi, 'getUserInfo')
				.mockResolvedValueOnce(mockedUserData);

			const result = await getRewards({ identity: mockIdentity });

			expect(getUserInfoSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				certified: false,
				nullishIdentityErrorMessage
			});

			expect(result).toEqual({ rewards: [expectedReward], lastTimestamp });
		});
	});

	describe('getReferrerInfo', () => {
		const numberOfReferrals = 2;
		const mockedReferrerInfo: ReferrerInfo = {
			referral_code: 123456,
			num_referrals: [numberOfReferrals]
		};

		it('should return referral code and number of referrals', async () => {
			const getReferrerInfoSpy = vi
				.spyOn(rewardApi, 'getReferrerInfo')
				.mockResolvedValueOnce(mockedReferrerInfo);

			const result = await getReferrerInfo({ identity: mockIdentity });

			expect(getReferrerInfoSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				certified: false,
				nullishIdentityErrorMessage
			});

			expect(result).toEqual({ referralCode: mockedReferrerInfo.referral_code, numberOfReferrals });
		});

		it('should return zero for number of referrals if not provided', async () => {
			const getReferrerInfoSpy = vi
				.spyOn(rewardApi, 'getReferrerInfo')
				.mockResolvedValueOnce({ ...mockedReferrerInfo, num_referrals: [] });

			const result = await getReferrerInfo({ identity: mockIdentity });

			expect(getReferrerInfoSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				certified: false,
				nullishIdentityErrorMessage
			});

			expect(result).toEqual({
				referralCode: mockedReferrerInfo.referral_code,
				numberOfReferrals: 0
			});
		});

		it('should display an error message', async () => {
			const err = new Error('test');
			const getReferrerInfoSpy = vi.spyOn(rewardApi, 'getReferrerInfo').mockRejectedValue(err);
			const spyToastsError = vi.spyOn(toastsStore, 'toastsError');

			await getReferrerInfo({ identity: mockIdentity });

			expect(getReferrerInfoSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				certified: false,
				nullishIdentityErrorMessage
			});
			expect(spyToastsError).toHaveBeenNthCalledWith(1, {
				msg: { text: get(i18n).referral.invitation.error.loading_referrer_info },
				err
			});
		});
	});

	describe('setReferrer', () => {
		const mockedReferrerCode = 123456;

		it('should successfully set referrer', async () => {
			const setReferrerSpy = vi
				.spyOn(rewardApi, 'setReferrer')
				.mockResolvedValueOnce(undefined as void);

			const result = await setReferrer({
				identity: mockIdentity,
				referrerCode: mockedReferrerCode
			});

			expect(setReferrerSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				referrerCode: mockedReferrerCode,
				nullishIdentityErrorMessage
			});

			expect(result).toEqual({ success: true });
		});

		it('should display an error message', async () => {
			const err = new Error('test');
			const setReferrerSpy = vi.spyOn(rewardApi, 'setReferrer').mockRejectedValue(err);
			const spyToastsError = vi.spyOn(toastsStore, 'toastsError');

			await setReferrer({ identity: mockIdentity, referrerCode: mockedReferrerCode });

			expect(setReferrerSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				referrerCode: mockedReferrerCode,
				nullishIdentityErrorMessage
			});
			expect(spyToastsError).toHaveBeenNthCalledWith(1, {
				msg: { text: get(i18n).referral.invitation.error.setting_referrer },
				err
			});
		});
	});

	describe('getRewardRequirementsFulfilled', () => {
		const buildMockTransaction: (timestamp: bigint) => AnyTransactionUiWithCmp = (timestamp) => ({
			transaction: { ...mockBtcTransactionUi, timestamp },
			component: 'bitcoin'
		});

		it('should be fulfilled for 1 of 3 criterias', () => {
			const [req1, req2, req3] = getRewardRequirementsFulfilled({
				transactions: [],
				totalUsdBalance: 9
			});

			expect(req1).toBeTruthy();
			expect(req2).toBeFalsy();
			expect(req3).toBeFalsy();
		});

		it('should be fulfilled for 2 of 3 criterias', () => {
			const [req1, req2, req3] = getRewardRequirementsFulfilled({
				transactions: [
					buildMockTransaction(
						BigInt(new Date().getTime() - MILLISECONDS_IN_DAY * 2) * NANO_SECONDS_IN_MILLISECOND // trx 2 days ago
					),
					buildMockTransaction(
						BigInt(new Date().getTime() - MILLISECONDS_IN_DAY * 3) * NANO_SECONDS_IN_MILLISECOND // trx 3 days ago
					)
				],
				totalUsdBalance: 9
			});

			expect(req1).toBeTruthy();
			expect(req2).toBeTruthy();
			expect(req3).toBeFalsy();
		});

		it('should be fulfilled for 2 of 3 criterias because transactions older than 7 days', () => {
			const [req1, req2, req3] = getRewardRequirementsFulfilled({
				transactions: [
					buildMockTransaction(
						BigInt(new Date().getTime() - MILLISECONDS_IN_DAY * 7) * NANO_SECONDS_IN_MILLISECOND // trx 7 days ago
					),
					buildMockTransaction(
						BigInt(new Date().getTime() - MILLISECONDS_IN_DAY * 7) * NANO_SECONDS_IN_MILLISECOND // trx 7 days ago
					)
				],
				totalUsdBalance: 22
			});

			expect(req1).toBeTruthy();
			expect(req2).toBeFalsy();
			expect(req3).toBeTruthy();
		});

		it('should be fulfilled for 3 of 3 criterias', () => {
			const [req1, req2, req3] = getRewardRequirementsFulfilled({
				transactions: [
					buildMockTransaction(
						BigInt(new Date().getTime() - MILLISECONDS_IN_DAY * 2) * NANO_SECONDS_IN_MILLISECOND // trx 2 days ago
					),
					buildMockTransaction(
						BigInt(new Date().getTime() - MILLISECONDS_IN_DAY * 3) * NANO_SECONDS_IN_MILLISECOND // trx 3 days ago
					)
				],
				totalUsdBalance: 22
			});

			expect(req1).toBeTruthy();
			expect(req2).toBeTruthy();
			expect(req3).toBeTruthy();
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

	describe('getRewardRequirementsFulfilled', () => {
		const buildMockTransaction: (timestamp: bigint) => AnyTransactionUiWithCmp = (timestamp) => ({
			transaction: { ...mockBtcTransactionUi, timestamp },
			component: 'bitcoin'
		});

		it('should be fulfilled for 1 of 3 criterias', () => {
			const [req1, req2, req3] = getRewardRequirementsFulfilled({
				transactions: [],
				totalUsdBalance: 9
			});

			expect(req1).toBeTruthy();
			expect(req2).toBeFalsy();
			expect(req3).toBeFalsy();
		});

		it('should be fulfilled for 2 of 3 criterias', () => {
			const [req1, req2, req3] = getRewardRequirementsFulfilled({
				transactions: [
					buildMockTransaction(
						BigInt(new Date().getTime() - MILLISECONDS_IN_DAY * 2) * NANO_SECONDS_IN_MILLISECOND // trx 2 days ago
					),
					buildMockTransaction(
						BigInt(new Date().getTime() - MILLISECONDS_IN_DAY * 3) * NANO_SECONDS_IN_MILLISECOND // trx 3 days ago
					)
				],
				totalUsdBalance: 9
			});

			expect(req1).toBeTruthy();
			expect(req2).toBeTruthy();
			expect(req3).toBeFalsy();
		});

		it('should be fulfilled for 2 of 3 criterias because transactions older than 7 days', () => {
			const [req1, req2, req3] = getRewardRequirementsFulfilled({
				transactions: [
					buildMockTransaction(
						BigInt(new Date().getTime() - MILLISECONDS_IN_DAY * 7) * NANO_SECONDS_IN_MILLISECOND // trx 7 days ago
					),
					buildMockTransaction(
						BigInt(new Date().getTime() - MILLISECONDS_IN_DAY * 7) * NANO_SECONDS_IN_MILLISECOND // trx 7 days ago
					)
				],
				totalUsdBalance: 22
			});

			expect(req1).toBeTruthy();
			expect(req2).toBeFalsy();
			expect(req3).toBeTruthy();
		});

		it('should be fulfilled for 3 of 3 criterias', () => {
			const [req1, req2, req3] = getRewardRequirementsFulfilled({
				transactions: [
					buildMockTransaction(
						BigInt(new Date().getTime() - MILLISECONDS_IN_DAY * 2) * NANO_SECONDS_IN_MILLISECOND // trx 2 days ago
					),
					buildMockTransaction(
						BigInt(new Date().getTime() - MILLISECONDS_IN_DAY * 3) * NANO_SECONDS_IN_MILLISECOND // trx 3 days ago
					)
				],
				totalUsdBalance: 22
			});

			expect(req1).toBeTruthy();
			expect(req2).toBeTruthy();
			expect(req3).toBeTruthy();
		});
	});

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
						getMockReward({ ledgerCanisterId: mockCkBtcToken.ledgerCanisterId, amount: ZERO_BI }),
						getMockReward({ ledgerCanisterId: mockCkUsdcToken.ledgerCanisterId, amount: ZERO_BI }),
						getMockReward({ ledgerCanisterId: mockIcpToken.ledgerCanisterId, amount: ZERO_BI })
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
			expect(result.amountOfRewards.toString()).toEqual('6');
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
			expect(result.amountOfRewards.toString()).toEqual('1');
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
			expect(result.amountOfRewards.toString()).toEqual('3');
		});
	});
});
