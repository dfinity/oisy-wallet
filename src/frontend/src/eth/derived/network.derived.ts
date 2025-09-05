import { enabledEthereumNetworks } from '$eth/derived/networks.derived';
import type { EthereumNetwork } from '$eth/types/network';
import { networkId } from '$lib/derived/network.derived';
import { derived, type Readable } from 'svelte/store';

export const selectedEthereumNetwork: Readable<EthereumNetwork | undefined> = derived(
	[enabledEthereumNetworks, networkId],
	([$enabledEthereumNetworks, $networkId]) =>
		$enabledEthereumNetworks.find(({ id }) => id === $networkId)
);
