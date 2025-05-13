import { RewardCriterionType } from '$lib/enums/reward-criterion-type';
import type {
	CampaignEligibility,
	MinLoginsCriterion,
	MinTotalAssetsUsdCriterion,
	MinTransactionsCriterion
} from '$lib/types/reward';

export const mockCampaignEligibilities: CampaignEligibility[] = [
	{
		campaignId: 'OISY Airdrop #1',
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
		campaignId: 'OISY Airdrop #3',
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
