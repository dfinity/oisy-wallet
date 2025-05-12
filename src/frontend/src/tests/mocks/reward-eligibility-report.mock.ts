import { RewardCriterionType } from '$lib/enums/reward-criterion-type';
import type { CampaignEligibility } from '$lib/types/reward';

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
			},
			{
				satisfied: false,
				type: RewardCriterionType.MIN_TRANSACTIONS,
				days: 6n,
				count: 3
			},
			{
				satisfied: false,
				type: RewardCriterionType.MIN_TOTAL_ASSETS_USD,
				usd: 21
			}
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
			},
			{
				satisfied: false,
				type: RewardCriterionType.MIN_TRANSACTIONS,
				days: 7n,
				count: 2
			},
			{
				satisfied: false,
				type: RewardCriterionType.MIN_TOTAL_ASSETS_USD,
				usd: 18
			}
		]
	}
];
