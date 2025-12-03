import type { StakeProviderConfig } from '$lib/types/stake';

export type ProviderUi<T extends StakeProviderConfig = StakeProviderConfig> = T & {
	totalPositionUsd: number;
};
