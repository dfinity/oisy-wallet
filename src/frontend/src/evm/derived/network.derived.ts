import type { EthereumNetwork } from '$eth/types/network';
import { enabledEvmNetworks } from '$evm/derived/networks.derived';
import { networkId } from '$lib/derived/network.derived';
import { derived, type Readable } from 'svelte/store';

export const selectedEvmNetwork: Readable<EthereumNetwork | undefined> = derived(
	[enabledEvmNetworks, networkId],
	([$enabledEvmNetworks, $networkId]) => $enabledEvmNetworks.find(({ id }) => id === $networkId)
);
