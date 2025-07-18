import type { EthereumNetwork } from '$eth/types/network';
import { enabledArbitrumNetworks } from '$evm/arbitrum/derived/networks.derived';
import { enabledBaseNetworks } from '$evm/base/derived/networks.derived';
import { enabledBscNetworks } from '$evm/bsc/derived/networks.derived';
import { enabledPolygonNetworks } from '$evm/polygon/derived/networks.derived';
import type { NetworkId } from '$lib/types/network';
import { derived, type Readable } from 'svelte/store';

export const enabledEvmNetworks: Readable<EthereumNetwork[]> = derived(
	[enabledBaseNetworks, enabledBscNetworks, enabledPolygonNetworks, enabledArbitrumNetworks],
	([
		$enabledBaseNetworks,
		$enabledBscNetworks,
		$enabledPolygonNetworks,
		$enabledArbitrumNetworks
	]) => [
		...$enabledBaseNetworks,
		...$enabledBscNetworks,
		...$enabledPolygonNetworks,
		...$enabledArbitrumNetworks
	]
);

export const enabledEvmNetworksIds: Readable<NetworkId[]> = derived(
	[enabledEvmNetworks],
	([$enabledEvmNetworks]) => $enabledEvmNetworks.map(({ id }) => id)
);
