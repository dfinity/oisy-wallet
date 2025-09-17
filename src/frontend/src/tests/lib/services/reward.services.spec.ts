import type {
	CampaignEligibility,
	EligibilityReport,
	NewVipRewardResponse,
	ReferrerInfo,
	RewardInfo,
	UserData
} from '$declarations/rewards/rewards.did';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import * as rewardApi from '$lib/api/reward.api';
import { ZERO } from '$lib/constants/app.constants';
import { QrCodeType } from '$lib/enums/qr-code-types';
import {
	claimVipReward,
	getCampaignEligibilities,
	getNewReward,
	getReferrerInfo,
	getRewards,
	getUserRewardsTokenAmounts,
	getUserRoles,
	setReferrer
} from '$lib/services/reward.services';
import { i18n } from '$lib/stores/i18n.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { AlreadyClaimedError, InvalidCampaignError, InvalidCodeError } from '$lib/types/errors';
import type { RewardClaimApiResponse, RewardResponseInfo } from '$lib/types/reward';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

const nullishIdentityErrorMessage = en.auth.error.no_internet_identity;

describe('reward-code', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getCampaignEligibilities', () => {
		const campaignId = 'deuteronomy';
		const campaign: CampaignEligibility = { eligible: true, available: true, criteria: [], probability_multiplier_enabled: false, probability_multiplier: 1 };
		const mockEligibilityReport: EligibilityReport = {
			campaigns: [[campaignId, campaign]]
		};

		it('should return campaign eligibilities', async () => {
			const getCampaignEligibilitiesSpy = vi
				.spyOn(rewardApi, 'isEligible')
				.mockResolvedValueOnce(mockEligibilityReport);

			const campaignEligibilities = await getCampaignEligibilities({ identity: mockIdentity });

			expect(getCampaignEligibilitiesSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				certified: false,
				nullishIdentityErrorMessage
			});
			expect(campaignEligibilities).toHaveLength(1);

			const campaignEligibility = campaignEligibilities.find(
				(campaign) => campaign.campaignId === campaignId
			);

			expect(campaignEligibility?.campaignId).toEqual(campaignId);
		});

		it('should display an error message', async () => {
			const err = new Error('test');
			const getCampaignEligibilitiesSpy = vi.spyOn(rewardApi, 'isEligible').mockRejectedValue(err);
			const spyToastsError = vi.spyOn(toastsStore, 'toastsError');

			await getCampaignEligibilities({ identity: mockIdentity });

			expect(getCampaignEligibilitiesSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				certified: false,
				nullishIdentityErrorMessage
			});
			expect(spyToastsError).toHaveBeenNthCalledWith(1, {
				msg: { text: get(i18n).vip.reward.error.loading_eligibility },
				err
			});
		});
	});

	describe('getUserRoles', () => {
		const mockedUserData: UserData = {
			is_vip: [true],
			superpowers: toNullable(['vip', 'gold']),
			airdrops: [],
			usage_awards: [],
			last_snapshot_timestamp: [BigInt(Date.now())],
			sprinkles: []
		};

		describe('VIP', () => {
			it('should return true if user is vip', async () => {
				const getUserInfoSpy = vi
					.spyOn(rewardApi, 'getUserInfo')
					.mockResolvedValueOnce(mockedUserData);

				const { isVip } = await getUserRoles({ identity: mockIdentity });

				expect(getUserInfoSpy).toHaveBeenCalledWith({
					identity: mockIdentity,
					certified: false,
					nullishIdentityErrorMessage
				});
				expect(isVip).toBeTruthy();
			});

			it('should return false if user is not vip', async () => {
				const userData: UserData = { ...mockedUserData, superpowers: [] };
				const getUserInfoSpy = vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValueOnce(userData);

				const { isVip } = await getUserRoles({ identity: mockIdentity });

				expect(getUserInfoSpy).toHaveBeenCalledWith({
					identity: mockIdentity,
					certified: false,
					nullishIdentityErrorMessage
				});
				expect(isVip).toBeFalsy();
			});
		});

		describe('Gold', () => {
			it('should return true if user is gold user', async () => {
				const getUserInfoSpy = vi
					.spyOn(rewardApi, 'getUserInfo')
					.mockResolvedValueOnce(mockedUserData);

				const { isGold } = await getUserRoles({ identity: mockIdentity });

				expect(getUserInfoSpy).toHaveBeenCalledWith({
					identity: mockIdentity,
					certified: false,
					nullishIdentityErrorMessage
				});
				expect(isGold).toBeTruthy();
			});

			it('should return false if user is not gold user', async () => {
				const userData: UserData = { ...mockedUserData, superpowers: [] };
				const getUserInfoSpy = vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValueOnce(userData);

				const { isGold } = await getUserRoles({ identity: mockIdentity });

				expect(getUserInfoSpy).toHaveBeenCalledWith({
					identity: mockIdentity,
					certified: false,
					nullishIdentityErrorMessage
				});
				expect(isGold).toBeFalsy();
			});
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

			const vipReward = await getNewReward({ campaignId: QrCodeType.VIP, identity: mockIdentity });

			expect(getNewVipRewardSpy).toHaveBeenCalledWith({
				rewardType: { campaign_id: 'vip' },
				identity: mockIdentity,
				nullishIdentityErrorMessage
			});
			expect(vipReward).toEqual(mockedNewRewardResponse.VipReward);
		});

		it('should display an error message for non vip user', async () => {
			const err = new Error('test');
			const getNewVipRewardSpy = vi.spyOn(rewardApi, 'getNewVipReward').mockRejectedValue(err);
			const spyToastsError = vi.spyOn(toastsStore, 'toastsError');

			await getNewReward({ campaignId: QrCodeType.VIP, identity: mockIdentity });

			expect(getNewVipRewardSpy).toHaveBeenCalledWith({
				rewardType: { campaign_id: 'vip' },
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
		const mockedClaimRewardResponse: RewardClaimApiResponse = {
			claimRewardResponse: { Success: null },
			claimedVipReward: { campaign_id: 'vip' }
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
			expect(result).toEqual({ success: true, campaignId: 'vip' });
		});

		it('should return false if an invalid vip reward code is used', async () => {
			const claimRewardResponse: RewardClaimApiResponse = {
				claimRewardResponse: { InvalidCode: null },
				claimedVipReward: undefined
			};
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
			expect(result.campaignId).toBeUndefined();
			expect(result.err).not.toBeUndefined();
			expect(result.err).toBeInstanceOf(InvalidCodeError);
		});

		it('should return false if an already used vip reward code is used', async () => {
			const claimRewardResponse: RewardClaimApiResponse = {
				claimRewardResponse: { AlreadyClaimed: null },
				claimedVipReward: undefined
			};
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
			expect(result.campaignId).toBeUndefined();
			expect(result.err).not.toBeUndefined();
			expect(result.err).toBeInstanceOf(AlreadyClaimedError);
		});

		it('should return false if no campaign id is returned', async () => {
			const claimRewardResponse: RewardClaimApiResponse = {
				claimRewardResponse: { Success: null },
				claimedVipReward: undefined
			};
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
			expect(result.campaignId).toBeUndefined();
			expect(result.err).not.toBeUndefined();
			expect(result.err).toBeInstanceOf(InvalidCampaignError);
		});
	});

	describe('getRewards', () => {
		const lastTimestamp = BigInt(Date.now());

		const mockedReward: RewardInfo = {
			timestamp: lastTimestamp,
			amount: 1000000n,
			ledger: mockIdentity.getPrincipal(),
			name: ['jackpot'],
			campaign_id: 'deuteronomy',
			campaign_name: ['deuteronomy']
		};
		const mockedUserData: UserData = {
			is_vip: [false],
			superpowers: [],
			airdrops: [],
			usage_awards: [[mockedReward]],
			last_snapshot_timestamp: [lastTimestamp],
			sprinkles: []
		};
		const expectedReward: RewardResponseInfo = {
			timestamp: lastTimestamp,
			amount: 1000000n,
			ledger: mockIdentity.getPrincipal(),
			name: 'jackpot',
			campaignName: 'deuteronomy',
			campaignId: 'deuteronomy'
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
			const setReferrerSpy = vi.spyOn(rewardApi, 'setReferrer').mockResolvedValueOnce({ Ok: null });

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

	describe('getUserRewardsTokenAmounts', () => {
		const defaultCampaignId = 'test';
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
			amount,
			campaignId
		}: {
			ledgerCanisterId: unknown;
			amount: bigint;
			campaignId?: string;
		}): RewardInfo =>
			({
				ledger: { toText: () => ledgerCanisterId },
				amount,
				campaign_id: campaignId ?? defaultCampaignId
			}) as unknown as RewardInfo;

		const baseMockUserData = {
			usage_awards: [],
			airdrops: [],
			last_snapshot_timestamp: undefined,
			is_vip: false,
			sprinkles: []
		} as unknown as UserData;

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
						getMockReward({ ledgerCanisterId: mockCkBtcToken.ledgerCanisterId, amount: ZERO }),
						getMockReward({ ledgerCanisterId: mockCkUsdcToken.ledgerCanisterId, amount: ZERO }),
						getMockReward({ ledgerCanisterId: mockIcpToken.ledgerCanisterId, amount: ZERO })
					]
				]
			})
			.mockResolvedValueOnce({
				...baseMockUserData,
				usage_awards: [
					[
						getMockReward({
							ledgerCanisterId: mockCkBtcToken.ledgerCanisterId,
							amount: 1000n,
							campaignId: 'season1'
						}),
						getMockReward({
							ledgerCanisterId: mockCkBtcToken.ledgerCanisterId,
							amount: 1000n,
							campaignId: 'season1'
						}),
						getMockReward({ ledgerCanisterId: mockCkBtcToken.ledgerCanisterId, amount: 1000n }),
						getMockReward({
							ledgerCanisterId: mockCkUsdcToken.ledgerCanisterId,
							amount: 2000n,
							campaignId: 'season1'
						}),
						getMockReward({ ledgerCanisterId: mockCkUsdcToken.ledgerCanisterId, amount: 2000n }),
						getMockReward({ ledgerCanisterId: mockIcpToken.ledgerCanisterId, amount: 3000n })
					]
				]
			});

		it('should calculate correct sums for all rewards', async () => {
			const result = await getUserRewardsTokenAmounts({
				ckBtcToken: mockCkBtcToken,
				ckUsdcToken: mockCkUsdcToken,
				icpToken: mockIcpToken,
				identity: mockIdentity,
				campaignId: defaultCampaignId
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
				identity: mockIdentity,
				campaignId: defaultCampaignId
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
				identity: mockIdentity,
				campaignId: defaultCampaignId
			});

			expect(result.ckBtcReward.toString()).toEqual('0');
			expect(result.ckUsdcReward.toString()).toEqual('0');
			expect(result.icpReward.toString()).toEqual('0');
			expect(result.amountOfRewards.toString()).toEqual('3');
		});

		it('should only load balances of a specific campaign', async () => {
			const result = await getUserRewardsTokenAmounts({
				ckBtcToken: mockCkBtcToken,
				ckUsdcToken: mockCkUsdcToken,
				icpToken: mockIcpToken,
				identity: mockIdentity,
				campaignId: 'season1'
			});

			expect(result.ckBtcReward.toString()).toEqual('2000');
			expect(result.ckUsdcReward.toString()).toEqual('2000');
			expect(result.icpReward.toString()).toEqual('0');
			expect(result.amountOfRewards.toString()).toEqual('3');
		});
	});
});
