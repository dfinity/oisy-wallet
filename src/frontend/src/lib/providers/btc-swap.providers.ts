import { CHAIN_FUSION_SWAP_ENABLED } from '$env/chain-fusion-swap.env';
import { CHAIN_FUSION_PAIRS } from '$lib/constants/swap.constants';
import { fetchChainFusionBtcQuote } from '$lib/services/chain-fusion-swap.services';
import { SwapProvider, type BtcSwapProviderConfig } from '$lib/types/swap';
import {
	chainFusionCompatibleDestinations,
	chainFusionSupportedSourceTokens
} from '$lib/utils/chain-fusion-swap.utils';

/**
 * Providers that quote a swap whose *source* is a Bitcoin token.
 *
 * Chain Fusion is the only one, and it is the reason the `btc` source category exists at
 * all: before it, a user holding BTC saw no swap offers whatsoever.
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
		: [])
];
