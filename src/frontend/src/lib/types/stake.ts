import type { EarningCardData } from '$lib/types/earning';
import type { Amount } from '$lib/types/send';
import type { Token } from '$lib/types/token';

export enum StakeProvider {
	GLDT = 'gldt'
}

export interface ClaimStakingRewardParams {
	token: Token;
	rewardAmount: Amount;
}

export interface StakeProviderConfig {
	name: string;
	logo: string;
	url: string;
	pageDescriptionKey: string;
	card: EarningCardData;
}
