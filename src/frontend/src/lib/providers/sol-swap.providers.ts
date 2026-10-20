import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { LIFI_SWAP_ENABLED } from '$env/rest/lifi.env';
import { NEAR_INTENTS_SWAP_ENABLED } from '$env/rest/near-intents.env';
import { fetchLifiSwapQuote } from '$lib/services/lifi-swap.services';
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
	// EVM → Solana. It quotes no Solana source yet: the Solana swap wizard cannot execute a LI.FI
	// transaction. The empty source list says the same to the source picker — without a list, the
	// entry would count as a wildcard and make every enabled SPL token selectable as a source.
	...(LIFI_SWAP_ENABLED
		? [
				{
					key: SwapProvider.LIFI,
					getQuote: fetchLifiSwapQuote,
					isEnabled: LIFI_SWAP_ENABLED,
					getSupportedTokens: () => Promise.resolve(new Set<string>()),
					getSupportedDestinations: buildLifiSupportedDestinations('sol')
				} satisfies SolSwapProviderConfig
			]
		: [])
];
