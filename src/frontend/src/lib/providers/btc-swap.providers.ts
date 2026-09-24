import { CHAIN_FUSION_SWAP_ENABLED } from '$env/chain-fusion-swap.env';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { NEAR_INTENTS_BTC_SWAP_ENABLED } from '$env/rest/near-intents.env';
import { CHAIN_FUSION_PAIRS } from '$lib/constants/swap.constants';
import { fetchChainFusionBtcQuote } from '$lib/services/chain-fusion-swap.services';
import {
	fetchNearIntentsSwapQuote,
	nearIntentsSupportedTokens
} from '$lib/services/near-intents.services';
import { SwapProvider, type BtcQuoteParams, type BtcSwapProviderConfig } from '$lib/types/swap';
import {
	chainFusionCompatibleDestinations,
	chainFusionSupportedSourceTokens
} from '$lib/utils/chain-fusion-swap.utils';
import { buildNearIntentsSupportedDestinations } from '$lib/utils/near-intents-swap.utils';

/**
 * Providers that quote a swap whose *source* is a Bitcoin token.
 *
 * Chain Fusion converts BTC to ckBTC on ICP; NEAR Intents bridges BTC to its EVM and
 * Solana destinations. Chain Fusion came first, and it is the reason the `btc` source
 * category exists at all: before it, a user holding BTC saw no swap offers whatsoever.
 */
export const btcSwapProviders: BtcSwapProviderConfig[] = [
	...(CHAIN_FUSION_SWAP_ENABLED
		? [
				{
					key: SwapProvider.CHAIN_FUSION,
					getQuote: fetchChainFusionBtcQuote,
					isEnabled: CHAIN_FUSION_SWAP_ENABLED,
					getSupportedTokens: () =>
						Promise.resolve(
							chainFusionSupportedSourceTokens({ category: 'btc', pairs: CHAIN_FUSION_PAIRS })
						),
					getSupportedDestinations: ({ sourceToken }) =>
						chainFusionCompatibleDestinations({ sourceToken, pairs: CHAIN_FUSION_PAIRS })
				} satisfies BtcSwapProviderConfig
			]
		: []),
	...(NEAR_INTENTS_BTC_SWAP_ENABLED
		? [
				{
					key: SwapProvider.NEAR_INTENTS,
					// The user's own BTC address doubles as the 1Click refund address.
					getQuote: ({ userBtcAddress, ...rest }: BtcQuoteParams) =>
						fetchNearIntentsSwapQuote({ ...rest, userAddress: userBtcAddress }),
					isEnabled: NEAR_INTENTS_BTC_SWAP_ENABLED,
					getSupportedTokens: () =>
						nearIntentsSupportedTokens({ networkIds: [BTC_MAINNET_NETWORK_ID] }),
					getSupportedDestinations: buildNearIntentsSupportedDestinations('btc')
				} satisfies BtcSwapProviderConfig
			]
		: [])
];
