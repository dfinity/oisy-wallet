import { EVM_NETWORKS_ENABLED } from '$env/networks/networks-evm/networks.evm.env';
import type { EthereumNetwork } from '$eth/types/network';
import { enabledBaseNetworks } from '$evm/base/derived/networks.derived';
import { enabledBscNetworks } from '$evm/bsc/derived/networks.derived';
import { derived, type Readable } from 'svelte/store';

export const enabledEvmNetworks: Readable<EthereumNetwork[]> = derived(
	[enabledBaseNetworks, enabledBscNetworks],
	([$enabledBaseNetworks, $enabledBscNetworks]) =>
		EVM_NETWORKS_ENABLED ? [...$enabledBaseNetworks, ...$enabledBscNetworks] : []
);
