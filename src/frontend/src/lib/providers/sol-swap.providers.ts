import { NEAR_INTENTS_SWAP_ENABLED } from '$env/rest/near-intents.env';
import { fetchNearIntentsSwapQuote } from '$lib/services/near-intents.services';
import { SwapProvider, type SolSwapProviderConfig } from '$lib/types/swap';

export const solSwapProviders: SolSwapProviderConfig[] = [
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
