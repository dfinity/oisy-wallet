import type { EthereumNetwork } from '$eth/types/network';
import { derived, type Readable } from 'svelte/store';
import { enabledBaseNetworks } from '../base/derived/networks.derived';

export const enabledEvmNetworks: Readable<EthereumNetwork[]> = derived(
	[enabledBaseNetworks],
	([$enabledBaseNetworks]) => [...$enabledBaseNetworks]
);
