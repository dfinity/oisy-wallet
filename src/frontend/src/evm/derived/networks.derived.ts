import { EVM_NETWORKS_ENABLED } from '$env/networks/networks-evm/networks.evm.env';
import type { EthereumNetwork } from '$eth/types/network';
import { enabledBaseNetworks } from '$evm/base/derived/networks.derived';
import { enabledBscNetworks } from '$evm/bsc/derived/networks.derived';
import type { NetworkId } from '$lib/types/network';
import { derived, type Readable } from 'svelte/store';

export const enabledEvmNetworks: Readable<EthereumNetwork[]> = derived(
	[enabledBaseNetworks, enabledBscNetworks],
	([$enabledBaseNetworks, $enabledBscNetworks]) =>
		EVM_NETWORKS_ENABLED ? [...$enabledBaseNetworks, ...$enabledBscNetworks] : []
);

export const enabledEvmNetworksIds: Readable<NetworkId[]> = derived(
	[enabledEvmNetworks],
	([$enabledEvmNetworks]) => $enabledEvmNetworks.map(({ id }) => id)
);
