import { SPRINKLES_SEASON_1_EPISODE_3_ID } from '$env/reward-campaigns.env';
import { RewardCriterionType } from '$lib/enums/reward-criterion-type';
import type {
	CampaignEligibility,
	MinLoginsCriterion,
	MinTotalAssetsUsdCriterion,
	MinTransactionsCriterion
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
				type: RewardCriterionType.MIN_TRANSACTIONS,
				days: 6n,
				count: 3
			} as MinTransactionsCriterion,
			{
				satisfied: false,
				type: RewardCriterionType.MIN_TOTAL_ASSETS_USD,
				usd: 21
			} as MinTotalAssetsUsdCriterion
		]
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
				type: RewardCriterionType.MIN_TRANSACTIONS,
				days: 7n,
				count: 2
			} as MinTransactionsCriterion,
			{
				satisfied: false,
				type: RewardCriterionType.MIN_TOTAL_ASSETS_USD,
				usd: 18
			} as MinTotalAssetsUsdCriterion
		]
	}
];
