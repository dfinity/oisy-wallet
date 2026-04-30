import { ONESEC_SWAP_ENABLED } from '$env/rest/onesec.env';
import { fetchOneSecIcpToEvmQuote } from '$lib/services/onesec-swap.services';
import { SwapProvider, type IcpBridgeSwapProviderConfig } from '$lib/types/swap';
import { oneSecIcpSupportedTokens } from '$lib/utils/onesec-swap.utils';

export const icpBridgeProviders: IcpBridgeSwapProviderConfig[] = [
	...(ONESEC_SWAP_ENABLED
		? [
				{
					key: SwapProvider.ONE_SEC,
					getQuote: fetchOneSecIcpToEvmQuote,
					isEnabled: ONESEC_SWAP_ENABLED,
					getSupportedTokens: oneSecIcpSupportedTokens
				}
			]
		: [])
];
