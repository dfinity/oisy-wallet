import { stakeProvidersConfig } from '$lib/config/stake.config';
import type { ProviderUi } from '$lib/types/provider-ui';
import { StakeProvider } from '$lib/types/stake';

export const mockProviderUi: ProviderUi = {
	...stakeProvidersConfig[StakeProvider.GLDT],
	totalPositionUsd: 123
};
