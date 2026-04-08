import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { NEAR_INTENTS_SWAP_ENABLED } from '$env/rest/near-intents.env';
import {
	fetchNearIntentsSwapQuote,
	nearIntentsSupportedTokens
} from '$lib/services/near-intents.services';
import { SwapProvider, type SolSwapProviderConfig } from '$lib/types/swap';

export const solSwapProviders: SolSwapProviderConfig[] = [
	...(NEAR_INTENTS_SWAP_ENABLED
		? [
				{
					key: SwapProvider.NEAR_INTENTS,
					getQuote: fetchNearIntentsSwapQuote,
					isEnabled: NEAR_INTENTS_SWAP_ENABLED,
					getSupportedTokens: () =>
						nearIntentsSupportedTokens({ networkIds: [SOLANA_MAINNET_NETWORK_ID] })
				} satisfies SolSwapProviderConfig
			]
		: [])
];
