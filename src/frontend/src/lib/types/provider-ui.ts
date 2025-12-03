import type { StakeProviderConfig } from '$lib/types/stake';
import type { TokenUi } from '$lib/types/token-ui';

export type ProviderUi<T extends StakeProviderConfig = StakeProviderConfig> = T & {
	maxApy: number;
	totalEarningPerYear: number;
	totalPosition: bigint;
	totalPositionUsd: number;
	tokens: TokenUi[];
};
