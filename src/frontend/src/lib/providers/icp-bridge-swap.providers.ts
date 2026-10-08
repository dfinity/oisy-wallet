import { CHAIN_FUSION_SWAP_ENABLED } from '$env/chain-fusion-swap.env';
import { ONESEC_SWAP_ENABLED } from '$env/rest/onesec.env';
import { CHAIN_FUSION_PAIRS, ONESEC_EVM_NETWORK_IDS } from '$lib/constants/swap.constants';
import { fetchChainFusionIcpQuote } from '$lib/services/chain-fusion-swap.services';
import { fetchOneSecIcpToEvmQuote } from '$lib/services/onesec-swap.services';
import { SwapProvider, type IcpBridgeSwapProviderConfig } from '$lib/types/swap';
import {
	chainFusionCompatibleDestinations,
	chainFusionSupportedSourceTokens
} from '$lib/utils/chain-fusion-swap.utils';
import {
	oneSecCompatibleDestinations,
	oneSecIcpSupportedTokens
} from '$lib/utils/onesec-swap.utils';

export const icpBridgeProviders: IcpBridgeSwapProviderConfig[] = [
	...(ONESEC_SWAP_ENABLED
		? [
				{
					key: SwapProvider.ONE_SEC,
					getQuote: fetchOneSecIcpToEvmQuote,
					isEnabled: ONESEC_SWAP_ENABLED,
					getSupportedTokens: oneSecIcpSupportedTokens,
					getSupportedDestinations: ({ sourceToken }) =>
						oneSecCompatibleDestinations({
							sourceToken,
							networkIds: ONESEC_EVM_NETWORK_IDS
						})
				} satisfies IcpBridgeSwapProviderConfig
			]
		: []),
	...(CHAIN_FUSION_SWAP_ENABLED
		? [
				{
					key: SwapProvider.CHAIN_FUSION,
					getQuote: fetchChainFusionIcpQuote,
					isEnabled: CHAIN_FUSION_SWAP_ENABLED,
					getSupportedTokens: () =>
						Promise.resolve(
							chainFusionSupportedSourceTokens({ category: 'icp', pairs: CHAIN_FUSION_PAIRS })
						),
					getSupportedDestinations: ({ sourceToken }) =>
						chainFusionCompatibleDestinations({ sourceToken, pairs: CHAIN_FUSION_PAIRS })
				} satisfies IcpBridgeSwapProviderConfig
			]
		: [])
];
