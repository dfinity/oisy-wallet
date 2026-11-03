import { XRP_MAINNET_NETWORK_ID } from '$env/networks/networks.xrp.env';
import { NEAR_INTENTS_XRP_SWAP_ENABLED } from '$env/rest/near-intents.env';
import {
	fetchNearIntentsSwapQuote,
	nearIntentsSupportedTokens
} from '$lib/services/near-intents.services';
import { SwapProvider, type XrpSwapProviderConfig } from '$lib/types/swap';
import { buildNearIntentsSupportedDestinations } from '$lib/utils/near-intents-swap.utils';

/**
 * Providers that quote a swap whose *source* is native XRP.
 *
 * NEAR Intents is the only one: no DEX in the list quotes an XRP pair, and XRP has no ck
 * twin for Chain Fusion. It quotes with the user's own XRP address, which is also where
 * 1Click refunds a deposit.
 */
export const xrpSwapProviders: XrpSwapProviderConfig[] = [
	...(NEAR_INTENTS_XRP_SWAP_ENABLED
		? [
				{
					key: SwapProvider.NEAR_INTENTS,
					getQuote: fetchNearIntentsSwapQuote,
					isEnabled: NEAR_INTENTS_XRP_SWAP_ENABLED,
					getSupportedTokens: () =>
						nearIntentsSupportedTokens({ networkIds: [XRP_MAINNET_NETWORK_ID] }),
					getSupportedDestinations: buildNearIntentsSupportedDestinations('xrp')
				} satisfies XrpSwapProviderConfig
			]
		: [])
];
