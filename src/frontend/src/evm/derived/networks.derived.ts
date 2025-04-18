import type { EthereumNetwork } from '$eth/types/network';
import { enabledBaseNetworks } from '$evm/base/derived/networks.derived';
import { enabledBscNetworks } from '$evm/bsc/derived/networks.derived';
import { derived, type Readable } from 'svelte/store';

export const enabledEvmNetworks: Readable<EthereumNetwork[]> = derived(
	[enabledBaseNetworks, enabledBscNetworks],
	([$enabledBaseNetworks, $enabledBscNetworks]) => [...$enabledBaseNetworks, ...$enabledBscNetworks]
);
