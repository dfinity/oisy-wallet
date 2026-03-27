import type { EligibilityReport } from '$declarations/rewards/rewards.did';
import {
	SPRINKLES_SEASON_1_EPISODE_3_ID,
	SPRINKLES_SEASON_1_EPISODE_4_ID,
	SPRINKLES_SEASON_1_EPISODE_5_ID
} from '$env/reward-campaigns.env';
import { RewardCriterionType } from '$lib/enums/reward-criterion-type';
import {
	getCampaignState,
	isEndedCampaign,
	isOngoingCampaign,
	isUpcomingCampaign,
	mapEligibilityReport,
	normalizeNetworkMultiplier,
	sortRewards
} from '$lib/utils/rewards.utils';
import { mockRewardCampaigns } from '$tests/mocks/reward-campaigns.mock';
import { assertNonNullish, toNullable } from '@dfinity/utils';

describe('rewards.utils', () => {
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
								probability_multiplier_enabled: [false],
								probability_multiplier: toNullable(1)
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
								probability_multiplier_enabled: [false],
								probability_multiplier: toNullable(1)
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

		describe('MinTransactionsInNetwork', () => {
			it('should map MinTransactionsInNetwork criterion', () => {
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
											MinTransactionsInNetwork: {
												duration: { Days: 30n },
												count: 10
											}
										}
									}
								],
								probability_multiplier_enabled: [false],
								probability_multiplier: toNullable(1)
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
								type: RewardCriterionType.MIN_TRANSACTIONS_IN_NETWORK,
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
								probability_multiplier_enabled: [false],
								probability_multiplier: toNullable(1)
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

		describe('MinTotalAssetsUsdInNetwork', () => {
			it('should map MinTotalAssetsUsdInNetwork criterion', () => {
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
											MinTotalAssetsUsdInNetwork: {
												usd: 1000
											}
										}
									}
								],
								probability_multiplier_enabled: [false],
								probability_multiplier: toNullable(1)
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
								type: RewardCriterionType.MIN_TOTAL_ASSETS_USD_IN_NETWORK,
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
							probability_multiplier_enabled: [false],
							probability_multiplier: toNullable(1)
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
							probability_multiplier_enabled: toNullable(),
							probability_multiplier: toNullable()
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

	describe('sortRewards', () => {
		it('should sort rewards by end date (asc)', () => {
			const result = sortRewards({ rewards: mockRewardCampaigns, sortByEndDate: 'asc' });

			expect(result.map((reward) => reward.id)).toEqual([
				SPRINKLES_SEASON_1_EPISODE_5_ID,
				SPRINKLES_SEASON_1_EPISODE_4_ID,
				SPRINKLES_SEASON_1_EPISODE_3_ID
			]);
		});

		it('should sort rewards by end date (desc)', () => {
			const result = sortRewards({ rewards: mockRewardCampaigns, sortByEndDate: 'desc' });

			expect(result.map((reward) => reward.id)).toEqual([
				SPRINKLES_SEASON_1_EPISODE_3_ID,
				SPRINKLES_SEASON_1_EPISODE_4_ID,
				SPRINKLES_SEASON_1_EPISODE_5_ID
			]);
		});
	});
});
