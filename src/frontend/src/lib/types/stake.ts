import type { Amount } from '$lib/types/send';
import type { Token } from '$lib/types/token';

export enum StakeProvider {
	GLDT = 'gldt'
}

export interface ClaimStakingRewardParams {
	token: Token;
	rewardAmount: Amount;
}
