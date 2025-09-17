import { SPRINKLES_SEASON_1_EPISODE_3_ID } from '$env/reward-campaigns.env';
import { RewardCriterionType } from '$lib/enums/reward-criterion-type';
import type {
	CampaignEligibility,
	MinLoginsCriterion,
	MinTotalAssetsUsdOverallCriterion,
	MinTransactionsOverallCriterion
} from '$lib/types/reward';

export const mockCampaignEligibilities: CampaignEligibility[] = [
	{
		campaignId: SPRINKLES_SEASON_1_EPISODE_3_ID,
		available: true,
		eligible: true,
		criteria: [
			{
				satisfied: true,
				type: RewardCriterionType.MIN_LOGINS,
				days: 6n,
				count: 2
			} as MinLoginsCriterion,
			{
				satisfied: false,
				type: RewardCriterionType.MIN_TRANSACTIONS_OVERALL,
				days: 6n,
				count: 3
			} as MinTransactionsOverallCriterion,
			{
				satisfied: false,
				type: RewardCriterionType.MIN_TOTAL_ASSETS_USD_OVERALL,
				usd: 21
			} as MinTotalAssetsUsdOverallCriterion
		],
		probabilityMultiplierEnabled: false,
		probabilityMultiplier: 1
	},
	{
		campaignId: 'sprinkles_s1e5',
		available: true,
		eligible: false,
		criteria: [
			{
				satisfied: true,
				type: RewardCriterionType.MIN_LOGINS,
				days: 7n,
				count: 1
			} as MinLoginsCriterion,
			{
				satisfied: false,
				type: RewardCriterionType.MIN_TRANSACTIONS_OVERALL,
				days: 7n,
				count: 2
			} as MinTransactionsOverallCriterion,
			{
				satisfied: false,
				type: RewardCriterionType.MIN_TOTAL_ASSETS_USD_OVERALL,
				usd: 18
			} as MinTotalAssetsUsdOverallCriterion
		],
		probabilityMultiplierEnabled: false,
		probabilityMultiplier: 1
	}
];
