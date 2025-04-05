import { enabledBaseNetworks } from '$eth/evm/base/derived/networks.derived';
import type { EthereumNetwork } from '$eth/types/network';
import { derived, type Readable } from 'svelte/store';

export const enabledEvmNetworks: Readable<EthereumNetwork[]> = derived(
	[enabledBaseNetworks],
	([$enabledBaseNetworks]) => [...$enabledBaseNetworks]
);
