import { fetchVeloraSwapAmount } from '$lib/services/velora-swap.services';
import { SwapProvider, type EvmSwapProviderConfig } from '$lib/types/swap';

export const evmSwapProviders: EvmSwapProviderConfig[] = [
	{
		key: SwapProvider.VELORA,
		getQuote: fetchVeloraSwapAmount,
		isEnabled: true
	}
];
