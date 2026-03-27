import { stakeProvidersConfig } from '$lib/config/stake.config';
import type { ProviderUi } from '$lib/types/provider-ui';
import { StakeProvider } from '$lib/types/stake';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';

export const mockProviderUi: ProviderUi = {
	...stakeProvidersConfig[StakeProvider.HARVEST_AUTOPILOTS],
	card: {
		...stakeProvidersConfig[StakeProvider.HARVEST_AUTOPILOTS].card,
		titles: ['mock.provider.title1', 'mock.provider.title2']
	},
	maxApy: 6.78,
	totalEarningPerYear: 45.6,
	totalPositionUsd: 123.45,
	tokens: [mockValidErc20Token]
};
