import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { LIFI_SWAP_ENABLED } from '$env/rest/lifi.env';
import { NEAR_INTENTS_SWAP_ENABLED } from '$env/rest/near-intents.env';
import { fetchLifiSwapQuote, lifiSolSupportedTokens } from '$lib/services/lifi-swap.services';
import {
	fetchNearIntentsSwapQuote,
	nearIntentsSupportedTokens
} from '$lib/services/near-intents.services';
import { SwapProvider, type SolSwapProviderConfig } from '$lib/types/swap';
import { buildLifiSupportedDestinations } from '$lib/utils/lifi-swap.utils';
import { buildNearIntentsSupportedDestinations } from '$lib/utils/near-intents-swap.utils';

const nearIntentsSolDestinations = buildNearIntentsSupportedDestinations('sol');

export const solSwapProviders: SolSwapProviderConfig[] = [
	...(NEAR_INTENTS_SWAP_ENABLED
		? [
				{
					key: SwapProvider.NEAR_INTENTS,
					getQuote: fetchNearIntentsSwapQuote,
					isEnabled: NEAR_INTENTS_SWAP_ENABLED,
					getSupportedTokens: () =>
						nearIntentsSupportedTokens({ networkIds: [SOLANA_MAINNET_NETWORK_ID] }),
					getSupportedDestinations: nearIntentsSolDestinations
				}
			]
		: []),
	// Every pair with Solana on either side reaches this registry, so the entry is what quotes
	// EVM → Solana and Solana → Solana; the request refuses Solana → EVM.
	...(LIFI_SWAP_ENABLED
		? [
				{
					key: SwapProvider.LIFI,
					getQuote: fetchLifiSwapQuote,
					isEnabled: LIFI_SWAP_ENABLED,
					getSupportedTokens: lifiSolSupportedTokens,
					getSupportedDestinations: buildLifiSupportedDestinations('sol')
				} satisfies SolSwapProviderConfig
			]
		: [])
];
