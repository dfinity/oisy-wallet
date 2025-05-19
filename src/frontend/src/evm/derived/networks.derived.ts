import type { EthereumNetwork } from '$eth/types/network';
import { enabledBaseNetworks } from '$evm/base/derived/networks.derived';
import { enabledBscNetworks } from '$evm/bsc/derived/networks.derived';
import { enabledPolygonNetworks } from '$evm/polygon/derived/networks.derived';
import type { NetworkId } from '$lib/types/network';
import { derived, type Readable } from 'svelte/store';

export const enabledEvmNetworks: Readable<EthereumNetwork[]> = derived(
	[enabledBaseNetworks, enabledBscNetworks, enabledPolygonNetworks],
	([$enabledBaseNetworks, $enabledBscNetworks, $enabledPolygonNetworks]) => [
		...$enabledBaseNetworks,
		...$enabledBscNetworks,
		...$enabledPolygonNetworks
	]
);

export const enabledEvmNetworksIds: Readable<NetworkId[]> = derived(
	[enabledEvmNetworks],
	([$enabledEvmNetworks]) => $enabledEvmNetworks.map(({ id }) => id)
);
