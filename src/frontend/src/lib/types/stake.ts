import type { EarningCardData } from '$lib/types/earning';
import type { Amount } from '$lib/types/send';
import type { Token } from '$lib/types/token';

export enum StakeProvider {
	GLDT = 'gldt',
	HARVEST_AUTOPILOTS = 'harvest_autopilots'
}

export interface ClaimStakingRewardParams {
	token: Token;
	rewardAmount: Amount;
}

export interface StakeProviderConfig {
	name: string;
	logo: string;
	url: string;
	card: EarningCardData;
}

export interface StakePosition {
	apy: number;
	staked: number;
	earning: number;
	earningPotential: number;
	token: Token;
}
