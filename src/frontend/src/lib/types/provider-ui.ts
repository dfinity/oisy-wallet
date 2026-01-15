import type { StakeProviderConfig } from '$lib/types/stake';
import type { Token } from '$lib/types/token';

export type ProviderUi<T extends StakeProviderConfig = StakeProviderConfig> = T & {
	maxApy: number;
	totalEarningPerYear: number;
	totalPositionUsd: number;
	tokens: Token[];
};
