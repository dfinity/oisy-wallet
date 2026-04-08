import { SUPPORTED_EVM_MAINNET_NETWORK_IDS } from '$env/networks/networks-evm/networks.evm.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { NEAR_INTENTS_SWAP_ENABLED } from '$env/rest/near-intents.env';
import {
	fetchNearIntentsSwapQuote,
	nearIntentsSupportedTokens
} from '$lib/services/near-intents.services';
import { fetchVeloraSwapAmount } from '$lib/services/velora-swap.services';
import { SwapProvider, type EvmSwapProviderConfig } from '$lib/types/swap';

export const evmSwapProviders: EvmSwapProviderConfig[] = [
	{
		key: SwapProvider.VELORA,
		getQuote: fetchVeloraSwapAmount,
		isEnabled: true
	},
	...(NEAR_INTENTS_SWAP_ENABLED
		? [
				{
					key: SwapProvider.NEAR_INTENTS,
					getQuote: fetchNearIntentsSwapQuote,
					isEnabled: NEAR_INTENTS_SWAP_ENABLED,
					getSupportedTokens: () =>
						nearIntentsSupportedTokens({
							networkIds: [ETHEREUM_NETWORK_ID, ...SUPPORTED_EVM_MAINNET_NETWORK_IDS]
						})
				} satisfies EvmSwapProviderConfig
			]
		: [])
];
