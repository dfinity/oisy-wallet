import type { EligibilityReport, RewardInfo, UserData } from '$declarations/rewards/rewards.did';
import { SPRINKLES_SEASON_1_EPISODE_3_ID } from '$env/reward-campaigns.env';
import * as rewardApi from '$lib/api/reward.api';
import { RewardCriterionType } from '$lib/enums/reward-criterion-type';
import type { RewardResponseInfo } from '$lib/types/reward';
import {
	INITIAL_REWARD_RESULT,
	getCampaignState,
	isEndedCampaign,
	isOngoingCampaign,
	isUpcomingCampaign,
	loadRewardResult,
	mapEligibilityReport
} from '$lib/utils/rewards.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockRewardCampaigns } from '$tests/mocks/reward-campaigns.mock';
import { assertNonNullish, fromNullable, toNullable } from '@dfinity/utils';

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

		const mappedMockedReward: RewardResponseInfo = {
			timestamp: mockedReward.timestamp,
			amount: mockedReward.amount,
			ledger: mockedReward.ledger,
			name: fromNullable(mockedReward.name),
			campaignName: fromNullable(mockedReward.campaign_name),
			campaignId: mockedReward.campaign_id
		};

		it('should return falsy reward result if result was already loaded', async () => {
			sessionStorage.setItem(INITIAL_REWARD_RESULT, 'true');

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBe('true');

			const { receivedReward, receivedJackpot, receivedReferral, reward } =
				await loadRewardResult(mockIdentity);

			expect(receivedReward).toBeFalsy();
			expect(receivedJackpot).toBeFalsy();
			expect(receivedReferral).toBeFalsy();
			expect(reward).toBeUndefined();
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

			const { receivedReward, receivedJackpot, receivedReferral, reward } =
				await loadRewardResult(mockIdentity);

			expect(receivedReward).toBeTruthy();
			expect(receivedJackpot).toBeFalsy();
			expect(receivedReferral).toBeFalsy();
			expect(reward).toEqual(mappedMockedReward);

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

			const { receivedReward, receivedJackpot, receivedReferral, reward } =
				await loadRewardResult(mockIdentity);

			expect(receivedReward).toBeTruthy();
			expect(receivedJackpot).toBeTruthy();
			expect(receivedReferral).toBeFalsy();
			expect(reward).toEqual({ ...mappedMockedReward, name: 'jackpot' });

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

			const { receivedReward, receivedJackpot, receivedReferral, reward } =
				await loadRewardResult(mockIdentity);

			expect(receivedReward).toBeTruthy();
			expect(receivedJackpot).toBeTruthy();
			expect(receivedReferral).toBeFalsy();
			expect(reward).toEqual({ ...mappedMockedReward, name: 'jackpot' });

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

			const { receivedReward, receivedJackpot, receivedReferral, reward } =
				await loadRewardResult(mockIdentity);

			expect(receivedReward).toBeTruthy();
			expect(receivedJackpot).toBeFalsy();
			expect(receivedReferral).toBeTruthy();
			expect(reward).toEqual({ ...mappedMockedReward, name: 'referral' });

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBe('true');
		});

		it('should return isReferral as true if one of several received rewards is a referral and set entry in the session storage', async () => {
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

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBeNull();

			const { receivedReward, receivedJackpot, receivedReferral, reward } =
				await loadRewardResult(mockIdentity);

			expect(receivedReward).toBeTruthy();
			expect(receivedJackpot).toBeFalsy();
			expect(receivedReferral).toBeTruthy();
			expect(reward).toEqual({ ...mappedMockedReward, name: 'referral' });

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

	describe('getCampaignState', () => {
		const mockedRewardCampaign = mockRewardCampaigns.find(
			({ id }) => id === SPRINKLES_SEASON_1_EPISODE_3_ID
		);
		assertNonNullish(mockedRewardCampaign);

		it('should return state ongoing for ongoing campaigns', () => {
			const startDate = new Date(Date.now() - 86400000);
			const endDate = new Date(Date.now() + 86400000);

			const mockedOngoingRewardCampaign = { ...mockedRewardCampaign, startDate, endDate };

			const result = getCampaignState(mockedOngoingRewardCampaign);

			expect(result).toBe('ongoing');
		});

		it('should return state ended for ended campaigns', () => {
			const endDate = new Date(Date.now() - 86400000);

			const mockedEndedRewardCampaign = { ...mockedRewardCampaign, endDate };

			const result = getCampaignState(mockedEndedRewardCampaign);

			expect(result).toBe('ended');
		});

		it('should return state upcoming for upcoming campaigns', () => {
			const startDate = new Date(Date.now() + 86400000);

			const mockedUpcomingRewardCampaign = { ...mockedRewardCampaign, startDate };

			const result = getCampaignState(mockedUpcomingRewardCampaign);

			expect(result).toBe('upcoming');
		});
	});

	describe('mapEligibilityReport', () => {
		it('should map empty eligibility report', () => {
			const report: EligibilityReport = {
				campaigns: []
			};

			const result = mapEligibilityReport(report);

			expect(result).toEqual([]);
		});

		describe('MinLogins', () => {
			it('should map MinLogins criterion with days duration', () => {
				const report: EligibilityReport = {
					campaigns: [
						[
							'campaign1',
							{
								available: true,
								eligible: false,
								criteria: [
									{
										satisfied: false,
										criterion: {
											MinLogins: {
												duration: { Days: 7n },
												count: 5,
												session_duration: toNullable()
											}
										}
									}
								]
							}
						]
					]
				};

				const result = mapEligibilityReport(report);

				expect(result).toEqual([
					{
						campaignId: 'campaign1',
						available: true,
						eligible: false,
						criteria: [
							{
								satisfied: false,
								type: RewardCriterionType.MIN_LOGINS,
								days: 7n,
								count: 5
							}
						]
					}
				]);
			});
		});

		describe('MinTransactions', () => {
			it('should map MinTransactions criterion', () => {
				const report: EligibilityReport = {
					campaigns: [
						[
							'campaign1',
							{
								available: true,
								eligible: true,
								criteria: [
									{
										satisfied: true,
										criterion: {
											MinTransactions: {
												duration: { Days: 30n },
												count: 10
											}
										}
									}
								]
							}
						]
					]
				};

				const result = mapEligibilityReport(report);

				expect(result).toEqual([
					{
						campaignId: 'campaign1',
						available: true,
						eligible: true,
						criteria: [
							{
								satisfied: true,
								type: RewardCriterionType.MIN_TRANSACTIONS,
								days: 30n,
								count: 10
							}
						]
					}
				]);
			});
		});

		describe('MinTotalAssetsUsd', () => {
			it('should map MinTotalAssetsUsd criterion', () => {
				const report: EligibilityReport = {
					campaigns: [
						[
							'campaign1',
							{
								available: true,
								eligible: true,
								criteria: [
									{
										satisfied: true,
										criterion: {
											MinTotalAssetsUsd: {
												usd: 1000
											}
										}
									}
								]
							}
						]
					]
				};

				const result = mapEligibilityReport(report);

				expect(result).toEqual([
					{
						campaignId: 'campaign1',
						available: true,
						eligible: true,
						criteria: [
							{
								satisfied: true,
								type: RewardCriterionType.MIN_TOTAL_ASSETS_USD,
								usd: 1000
							}
						]
					}
				]);
			});
		});

		it('should map unknown criterion type', () => {
			const report: EligibilityReport = {
				campaigns: [
					[
						'campaign1',
						{
							available: true,
							eligible: false,
							criteria: [
								{
									satisfied: false,
									criterion: {
										MinReferrals: { count: 5 }
									}
								}
							]
						}
					]
				]
			};

			const result = mapEligibilityReport(report);

			expect(result).toEqual([
				{
					campaignId: 'campaign1',
					available: true,
					eligible: false,
					criteria: [
						{
							satisfied: false,
							type: RewardCriterionType.UNKNOWN
						}
					]
				}
			]);
		});

		it('should map multiple criteria for a single campaign', () => {
			const report: EligibilityReport = {
				campaigns: [
					[
						'campaign1',
						{
							available: true,
							eligible: true,
							criteria: [
								{
									satisfied: true,
									criterion: {
										MinLogins: {
											duration: { Days: 7n },
											count: 5,
											session_duration: toNullable()
										}
									}
								},
								{
									satisfied: true,
									criterion: {
										MinTotalAssetsUsd: {
											usd: 1000
										}
									}
								}
							]
						}
					]
				]
			};

			const result = mapEligibilityReport(report);

			expect(result).toEqual([
				{
					campaignId: 'campaign1',
					available: true,
					eligible: true,
					criteria: [
						{
							satisfied: true,
							type: RewardCriterionType.MIN_LOGINS,
							days: 7n,
							count: 5
						},
						{
							satisfied: true,
							type: RewardCriterionType.MIN_TOTAL_ASSETS_USD,
							usd: 1000
						}
					]
				}
			]);
		});
	});
});
