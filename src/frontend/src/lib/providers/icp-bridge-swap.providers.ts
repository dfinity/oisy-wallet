import { ONESEC_SWAP_ENABLED } from '$env/rest/onesec.env';
import { ONESEC_EVM_NETWORK_IDS } from '$lib/constants/swap.constants';
import { fetchOneSecIcpToEvmQuote } from '$lib/services/onesec-swap.services';
import { SwapProvider, type IcpBridgeSwapProviderConfig } from '$lib/types/swap';
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
		: [])
];
