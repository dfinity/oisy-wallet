import type { EligibilityReport } from '$declarations/rewards/rewards.did';

export const mockEligibilityReport: EligibilityReport = {
	campaigns: [
		[
			'OISY Airdrop #1',
			{
				available: true,
				eligible: true,
				criteria: [
					{
						satisfied: true,
						criterion: { MinLogins: { duration: { Days: BigInt(6) }, count: 2 } }
					},
					{
						satisfied: false,
						criterion: { MinTransactions: { duration: { Days: BigInt(6) }, count: 3 } }
					},
					{ satisfied: false, criterion: { MinTotalAssetsUsd: { usd: 21 } } }
				]
			}
		],
		[
			'OISY Airdrop #3',
			{
				available: true,
				eligible: false,
				criteria: [
					{
						satisfied: true,
						criterion: { MinLogins: { duration: { Days: BigInt(7) }, count: 1 } }
					},
					{
						satisfied: false,
						criterion: { MinTransactions: { duration: { Days: BigInt(7) }, count: 2 } }
					},
					{ satisfied: false, criterion: { MinTotalAssetsUsd: { usd: 18 } } }
				]
			}
		]
	]
};
