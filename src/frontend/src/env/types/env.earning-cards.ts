import type { EarningCardsSchema } from '$env/schema/env-earning-cards.schema';
import type z from 'zod';

export enum EarningCardFields {
	APY = 'apy',
	CURRENT_STAKED = 'currentStaked',
	CURRENT_EARNING = 'currentEarning',
	EARNING_POTENTIAL = 'earningPotential',
	CLAIMABLE_REWARDS = 'claimableRewards',
	TERMS = 'terms'
}

export type EarningCards = z.infer<typeof EarningCardsSchema>;
