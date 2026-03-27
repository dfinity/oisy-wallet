import { NEAR_INTENTS_SWAP_ENABLED } from '$env/rest/near-intents.env';
import { fetchNearIntentsSwapQuote } from '$lib/services/near-intents.services';
import { fetchVeloraSwapAmount } from '$lib/services/velora-swap.services';
import { SwapProvider, type EvmSwapProviderConfig } from '$lib/types/swap';

export const evmSwapProviders: EvmSwapProviderConfig[] = [
	{
		key: SwapProvider.VELORA,
		getQuote: fetchVeloraSwapAmount,
		isEnabled: true
	},
	...(NEAR_INTENTS_SWAP_ENABLED
		? [
				{
					key: SwapProvider.NEAR_INTENTS,
					getQuote: fetchNearIntentsSwapQuote,
					isEnabled: NEAR_INTENTS_SWAP_ENABLED
				}
			]
		: [])
];
