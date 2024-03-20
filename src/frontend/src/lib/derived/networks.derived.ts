import { ICP_NETWORK } from '$env/networks.env';
import { enabledEthereumNetworks } from '$eth/derived/networks.derived';
import type { Network } from '$lib/types/network';
import { derived, type Readable } from 'svelte/store';

export const networks: Readable<Network[]> = derived(
	[enabledEthereumNetworks],
	([$enabledEthereumNetworks]) => [...$enabledEthereumNetworks, ICP_NETWORK]
);
