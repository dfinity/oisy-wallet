import { SUPPORTED_EVM_MAINNET_NETWORK_IDS } from '$env/networks/networks-evm/networks.evm.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { NEAR_INTENTS_SWAP_ENABLED } from '$env/rest/near-intents.env';
import { ONESEC_SWAP_ENABLED } from '$env/rest/onesec.env';
import { ONESEC_EVM_NETWORK_IDS } from '$lib/constants/swap.constants';
import {
	fetchNearIntentsSwapQuote,
	nearIntentsSupportedTokens
} from '$lib/services/near-intents.services';
import { fetchOneSecEvmToIcpQuote } from '$lib/services/onesec-swap.services';
import { fetchVeloraSwapAmount } from '$lib/services/velora-swap.services';
import { SwapProvider, type EvmSwapProviderConfig } from '$lib/types/swap';
import { buildNearIntentsSupportedDestinations } from '$lib/utils/near-intents-swap.utils';
import {
	oneSecCompatibleDestinations,
	oneSecEvmSupportedTokens
} from '$lib/utils/onesec-swap.utils';
import { buildSymmetricSupportedDestinations } from '$lib/utils/swap-providers.utils';

const symmetricEvmDestinations = buildSymmetricSupportedDestinations('evm');
const nearIntentsEvmDestinations = buildNearIntentsSupportedDestinations('evm');

export const evmSwapProviders: EvmSwapProviderConfig[] = [
	{
		key: SwapProvider.VELORA,
		getQuote: fetchVeloraSwapAmount,
		isEnabled: true,
		getSupportedDestinations: symmetricEvmDestinations
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
						}),
					getSupportedDestinations: nearIntentsEvmDestinations
				}
			]
		: []),
	...(ONESEC_SWAP_ENABLED
		? [
				{
					key: SwapProvider.ONE_SEC,
					getQuote: fetchOneSecEvmToIcpQuote,
					isEnabled: ONESEC_SWAP_ENABLED,
					getSupportedTokens: () =>
						oneSecEvmSupportedTokens({ networkIds: ONESEC_EVM_NETWORK_IDS }),
					getSupportedDestinations: ({ sourceToken }) =>
						oneSecCompatibleDestinations({
							sourceToken,
							networkIds: ONESEC_EVM_NETWORK_IDS
						})
				} satisfies EvmSwapProviderConfig
			]
		: [])
];
