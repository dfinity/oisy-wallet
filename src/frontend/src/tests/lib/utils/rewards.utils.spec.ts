import type { EligibilityReport, RewardInfo, UserData } from '$declarations/rewards/rewards.did';
import { SPRINKLES_SEASON_1_EPISODE_3_ID } from '$env/reward-campaigns.env';
import * as rewardApi from '$lib/api/reward.api';
import { RewardCriterionType } from '$lib/enums/reward-criterion-type';
import { RewardType } from '$lib/enums/reward-type';
import type { RewardResponseInfo } from '$lib/types/reward';
import {
	INITIAL_REWARD_RESULT,
	getCampaignState,
	isEndedCampaign,
	isOngoingCampaign,
	isUpcomingCampaign,
	loadRewardResult,
	mapEligibilityReport,
	normalizeNetworkMultiplier
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

			const { reward, lastTimestamp, rewardType } = await loadRewardResult(mockIdentity);

			expect(rewardType).toBeUndefined();
			expect(reward).toBeUndefined();
			expect(lastTimestamp).toBeUndefined();
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

			const { rewardType } = await loadRewardResult(mockIdentity);

			expect(rewardType).toBeUndefined();

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBe('true');
		});

		it('should return reward with type airdrop and set entry in the session storage', async () => {
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

			const { reward, rewardType } = await loadRewardResult(mockIdentity);

			expect(reward).toEqual(mappedMockedReward);
			expect(rewardType).toBe(RewardType.AIRDROP);

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBe('true');
		});

		it('should return reward with type referral and set entry in the session storage', async () => {
			const customMockedReward: RewardInfo = { ...mockedReward, name: [RewardType.REFERRAL] };
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

			const { reward, rewardType } = await loadRewardResult(mockIdentity);

			expect(reward).toEqual({ ...mappedMockedReward, name: RewardType.REFERRAL });
			expect(rewardType).toBe(RewardType.REFERRAL);

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBe('true');
		});

		it('should return reward with type referral if one of several received rewards is a referral and set entry in the session storage', async () => {
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

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBeNull();

			const { reward, rewardType } = await loadRewardResult(mockIdentity);

			expect(reward).toEqual({ ...mappedMockedReward, name: RewardType.REFERRAL });
			expect(rewardType).toBe(RewardType.REFERRAL);

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBe('true');
		});

		it('should return reward with type referrer and set entry in the session storage', async () => {
			const customMockedReward: RewardInfo = { ...mockedReward, name: [RewardType.REFERRER] };
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

			const { reward, rewardType } = await loadRewardResult(mockIdentity);

			expect(reward).toEqual({ ...mappedMockedReward, name: RewardType.REFERRER });
			expect(rewardType).toBe(RewardType.REFERRER);

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBe('true');
		});

		it('should return reward with type referrer if one of several received rewards is a referrer and set entry in the session storage', async () => {
			const customMockedReferrerReward: RewardInfo = {
				...mockedReward,
				name: [RewardType.REFERRER]
			};
			const customMockedReferralReward: RewardInfo = {
				...mockedReward,
				name: [RewardType.REFERRAL]
			};
			const mockedUserData: UserData = {
				is_vip: [false],
				superpowers: [],
				airdrops: [],
				usage_awards: [[mockedReward, customMockedReferrerReward, customMockedReferralReward]],
				last_snapshot_timestamp: [lastTimestamp],
				sprinkles: []
			};
			vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockedUserData);

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBeNull();

			const { reward, rewardType } = await loadRewardResult(mockIdentity);

			expect(reward).toEqual({ ...mappedMockedReward, name: RewardType.REFERRER });
			expect(rewardType).toBe(RewardType.REFERRER);

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBe('true');
		});

		it('should return reward with type referee and set entry in the session storage', async () => {
			const customMockedReward: RewardInfo = { ...mockedReward, name: [RewardType.REFEREE] };
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

			const { reward, rewardType } = await loadRewardResult(mockIdentity);

			expect(reward).toEqual({ ...mappedMockedReward, name: RewardType.REFEREE });
			expect(rewardType).toBe(RewardType.REFEREE);

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBe('true');
		});

		it('should return reward with type referee if one of several received rewards is a referee and set entry in the session storage', async () => {
			const customMockedRefereeReward: RewardInfo = { ...mockedReward, name: [RewardType.REFEREE] };
			const customMockedReferralReward: RewardInfo = {
				...mockedReward,
				name: [RewardType.REFERRAL]
			};
			const mockedUserData: UserData = {
				is_vip: [false],
				superpowers: [],
				airdrops: [],
				usage_awards: [[mockedReward, customMockedRefereeReward, customMockedReferralReward]],
				last_snapshot_timestamp: [lastTimestamp],
				sprinkles: []
			};
			vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockedUserData);

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBeNull();

			const { reward, rewardType } = await loadRewardResult(mockIdentity);

			expect(reward).toEqual({ ...mappedMockedReward, name: RewardType.REFEREE });
			expect(rewardType).toBe(RewardType.REFEREE);

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBe('true');
		});

		it('should return reward with type jackpot and set entry in the session storage', async () => {
			const customMockedReward: RewardInfo = { ...mockedReward, name: [RewardType.JACKPOT] };
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

			const { reward, rewardType } = await loadRewardResult(mockIdentity);

			expect(reward).toEqual({ ...mappedMockedReward, name: RewardType.JACKPOT });
			expect(rewardType).toBe(RewardType.JACKPOT);

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBe('true');
		});

		it('should return reward with type jackpot if one of several received rewards is a jackpot and set entry in the session storage', async () => {
			const customMockedJackpotReward: RewardInfo = { ...mockedReward, name: [RewardType.JACKPOT] };
			const customMockedReferralReward: RewardInfo = {
				...mockedReward,
				name: [RewardType.REFERRAL]
			};
			const mockedUserData: UserData = {
				is_vip: [false],
				superpowers: [],
				airdrops: [],
				usage_awards: [[mockedReward, customMockedJackpotReward, customMockedReferralReward]],
				last_snapshot_timestamp: [lastTimestamp],
				sprinkles: []
			};
			vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockedUserData);

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBeNull();

			const { reward, rewardType } = await loadRewardResult(mockIdentity);

			expect(reward).toEqual({ ...mappedMockedReward, name: RewardType.JACKPOT });
			expect(rewardType).toBe(RewardType.JACKPOT);

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBe('true');
		});

		it('should return reward with type leaderboard and set entry in the session storage', async () => {
			const customMockedReward: RewardInfo = { ...mockedReward, name: [RewardType.LEADERBOARD] };
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

			const { reward, rewardType } = await loadRewardResult(mockIdentity);

			expect(reward).toEqual({ ...mappedMockedReward, name: RewardType.LEADERBOARD });
			expect(rewardType).toBe(RewardType.LEADERBOARD);

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBe('true');
		});

		it('should return reward with type leaderboard if one of several received rewards is a leaderboard and set entry in the session storage', async () => {
			const customMockedLeaderboardReward: RewardInfo = {
				...mockedReward,
				name: [RewardType.LEADERBOARD]
			};
			const customMockedJackpotReward: RewardInfo = { ...mockedReward, name: [RewardType.JACKPOT] };
			const mockedUserData: UserData = {
				is_vip: [false],
				superpowers: [],
				airdrops: [],
				usage_awards: [[mockedReward, customMockedLeaderboardReward, customMockedJackpotReward]],
				last_snapshot_timestamp: [lastTimestamp],
				sprinkles: []
			};
			vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockedUserData);

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBeNull();

			const { reward, rewardType } = await loadRewardResult(mockIdentity);

			expect(reward).toEqual({ ...mappedMockedReward, name: RewardType.LEADERBOARD });
			expect(rewardType).toBe(RewardType.LEADERBOARD);

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBe('true');
		});

		it('should return timestamp on initial loading with new reward of type airdrop', async () => {
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

			const { reward, lastTimestamp: timestamp, rewardType } = await loadRewardResult(mockIdentity);

			expect(reward).toEqual(mappedMockedReward);
			expect(timestamp).toBe(lastTimestamp);
			expect(rewardType).toBe(RewardType.AIRDROP);

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBe('true');
		});

		it('should return timestamp on first login', async () => {
			const mockedUserData: UserData = {
				is_vip: [false],
				superpowers: [],
				airdrops: [],
				usage_awards: [],
				last_snapshot_timestamp: [0n],
				sprinkles: []
			};
			vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockedUserData);

			expect(sessionStorage.getItem(INITIAL_REWARD_RESULT)).toBeNull();

			const { lastTimestamp } = await loadRewardResult(mockIdentity);

			expect(lastTimestamp).toBe(0n);
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
								],
								probability_multiplier_enabled: false,
								probability_multiplier: 1
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
						],
						probabilityMultiplierEnabled: false,
						probabilityMultiplier: 1
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
								],
								probability_multiplier_enabled: false,
								probability_multiplier: 1
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
						],
						probabilityMultiplierEnabled: false,
						probabilityMultiplier: 1
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
								],
								probability_multiplier_enabled: false,
								probability_multiplier: 1
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
						],
						probabilityMultiplierEnabled: false,
						probabilityMultiplier: 1
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
							],
							probability_multiplier_enabled: false,
							probability_multiplier: 1
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
					],
					probabilityMultiplierEnabled: false,
					probabilityMultiplier: 1
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
							],
							probability_multiplier: 1,
							probability_multiplier_enabled: false
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
					],
					probabilityMultiplierEnabled: false,
					probabilityMultiplier: 1
				}
			]);
		});
	});

	describe('normalizeNetworkMultiplier', () => {
		it.each([1, 2, 3, 4, 5, 6, 7, 8])(
			'should return correct network multiplier for input %i',
			(input) => {
				const result = normalizeNetworkMultiplier(input);

				expect(result).toEqual(input);
			}
		);

		it('should return default value for not supported values', () => {
			const result = normalizeNetworkMultiplier(22);

			expect(result).toEqual(1);
		});
	});
});
