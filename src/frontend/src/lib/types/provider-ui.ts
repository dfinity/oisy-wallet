import type { StakeProviderConfig } from '$lib/types/stake';
import type { TokenUi } from '$lib/types/token-ui';
import type { Token } from '$lib/types/token';

export type ProviderUi<T extends StakeProviderConfig = StakeProviderConfig> = T & {
	maxApy: number;
	totalEarningPerYear: number;
	totalPositionUsd: number;
	tokens: Token[];
};
