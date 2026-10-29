import { btcSwapProviders } from '$lib/providers/btc-swap.providers';
import { evmSwapProviders } from '$lib/providers/evm-swap.providers';
import { icpBridgeProviders } from '$lib/providers/icp-bridge-swap.providers';
import { solSwapProviders } from '$lib/providers/sol-swap.providers';
import { swapProviders } from '$lib/providers/swap.providers';
import { xrpSwapProviders } from '$lib/providers/xrp-swap.providers';
import type { NetworkId } from '$lib/types/network';
import type { SwapProvider } from '$lib/types/swap';
import {
	isNetworkIdBitcoin,
	isNetworkIdICP,
	isNetworkIdSolana,
	isNetworkIdXrp
} from '$lib/utils/network.utils';
import { findSwapProvider } from '$lib/utils/swap.utils';
import { nonNullish } from '@dfinity/utils';

interface RegisteredProvider {
	key: SwapProvider;
	isEnabled: boolean;
}

export interface SwapProviderPool {
	// Serve the pair's source or destination network.
	related: SwapProvider[];
	// Every other enabled provider.
	wider: SwapProvider[];
}

// The registries a pair from this network is priced with, as `fetchSwapAmounts` routes it; ICP
// covers its own pairs and the bridges out of it.
const registriesFor = (networkId: NetworkId): RegisteredProvider[][] =>
	isNetworkIdICP(networkId)
		? [swapProviders, icpBridgeProviders]
		: isNetworkIdBitcoin(networkId)
			? [btcSwapProviders]
			: isNetworkIdXrp(networkId)
				? [xrpSwapProviders]
				: isNetworkIdSolana(networkId)
					? [solSwapProviders]
					: [evmSwapProviders];

// Enabled and drawable only, once each, in registry order.
const enabledProviders = (registries: RegisteredProvider[][]): SwapProvider[] => [
	...new Set(
		registries
			.flat()
			.filter(({ key, isEnabled }) => isEnabled && nonNullish(findSwapProvider(key)))
			.map(({ key }) => key)
	)
];

/**
 * OISY's swap providers for the Smart Swap scroll to show alongside the ones a round actually
 * asks, ordered by relevance to the pair. The registries and their flags are the only source,
 * so a disabled provider never appears.
 */
export const swapProviderPool = ({
	sourceNetworkId,
	destinationNetworkId
}: {
	sourceNetworkId: NetworkId;
	destinationNetworkId: NetworkId;
}): SwapProviderPool => {
	const related = enabledProviders([
		...registriesFor(sourceNetworkId),
		...registriesFor(destinationNetworkId)
	]);
	const wider = enabledProviders([
		swapProviders,
		icpBridgeProviders,
		evmSwapProviders,
		btcSwapProviders,
		solSwapProviders,
		xrpSwapProviders
	]).filter((provider) => !related.includes(provider));

	return { related, wider };
};
