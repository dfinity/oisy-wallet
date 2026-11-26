import { BTC_SEND_VIA_BACKEND_ENABLED } from '$env/btc.env';
import { CHAIN_FUSION_SWAP_ENABLED } from '$env/chain-fusion-swap.env';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { LIFI_BTC_SWAP_ENABLED, LIFI_SWAP_ENABLED } from '$env/rest/lifi.env';
import { NEAR_INTENTS_BTC_SWAP_ENABLED } from '$env/rest/near-intents.env';
import { RIFT_SWAP_ENABLED } from '$env/rest/rift.env';
import { CHAIN_FUSION_PAIRS } from '$lib/constants/swap.constants';
import { fetchChainFusionBtcQuote } from '$lib/services/chain-fusion-swap.services';
import {
	fetchLifiBtcSwapQuote,
	lifiBtcSupportedDestinations,
	lifiBtcSupportedTokens
} from '$lib/services/lifi-btc-swap.services';
import {
	fetchNearIntentsSwapQuote,
	nearIntentsSupportedTokens
} from '$lib/services/near-intents.services';
import {
	fetchRiftBtcSwapQuote,
	riftBtcSupportedDestinations,
	riftBtcSupportedTokens
} from '$lib/services/rift-swap.services';
import { SwapProvider, type BtcQuoteParams, type BtcSwapProviderConfig } from '$lib/types/swap';
import {
	chainFusionCompatibleDestinations,
	chainFusionSupportedSourceTokens
} from '$lib/utils/chain-fusion-swap.utils';
import { buildNearIntentsSupportedDestinations } from '$lib/utils/near-intents-swap.utils';

// Native BTC through the backend's send path only: LI.FI's outputs (an `OP_RETURN` memo among them)
// are built and signed in the frontend, which the Chain Fusion Signer cannot do.
const LIFI_BTC_PROVIDER_ENABLED =
	LIFI_SWAP_ENABLED && LIFI_BTC_SWAP_ENABLED && BTC_SEND_VIA_BACKEND_ENABLED;

// Native BTC through the backend's send path only, as for LI.FI: a Rift deposit is tracked by a row
// created between signing and broadcasting, which only that path allows.
const RIFT_BTC_PROVIDER_ENABLED = RIFT_SWAP_ENABLED && BTC_SEND_VIA_BACKEND_ENABLED;

/**
 * Providers that quote a swap whose *source* is a Bitcoin token.
 *
 * Chain Fusion converts BTC to ckBTC on ICP; NEAR Intents and LI.FI bridge BTC to EVM and
 * Solana destinations, Rift to EVM ones. Chain Fusion came first, and it is the reason the `btc`
 * source category exists at all: before it, a user holding BTC saw no swap offers whatsoever.
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
		: []),
	...(LIFI_BTC_PROVIDER_ENABLED
		? [
				{
					key: SwapProvider.LIFI,
					// Read when called, not when this list is built: `lifi-btc-swap.services` imports
					// `swap.services`, which imports this registry. Loaded first, that service has not run
					// yet here, and its functions would still be uninitialized.
					getQuote: (params: BtcQuoteParams) => fetchLifiBtcSwapQuote(params),
					isEnabled: LIFI_BTC_PROVIDER_ENABLED,
					getSupportedTokens: () => lifiBtcSupportedTokens(),
					getSupportedDestinations: (params) => lifiBtcSupportedDestinations(params)
				} satisfies BtcSwapProviderConfig
			]
		: []),
	...(RIFT_BTC_PROVIDER_ENABLED
		? [
				{
					key: SwapProvider.RIFT,
					// Read when called, as LI.FI's are: Rift's execution, in the same service, will need
					// `swap.services`, which imports this registry.
					getQuote: (params: BtcQuoteParams) => fetchRiftBtcSwapQuote(params),
					isEnabled: RIFT_BTC_PROVIDER_ENABLED,
					getSupportedTokens: () => riftBtcSupportedTokens(),
					getSupportedDestinations: (params) => riftBtcSupportedDestinations(params)
				} satisfies BtcSwapProviderConfig
			]
		: [])
];
