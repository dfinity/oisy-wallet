import {
	BASE_MAINNET_ENABLED,
	BASE_NETWORK,
	BASE_SEPOLIA_NETWORK
} from '$env/networks/networks-evm/networks.evm.base.env';
import type { EthereumNetwork } from '$eth/types/network';
import { testnets } from '$lib/derived/testnets.derived';
import { derived, type Readable } from 'svelte/store';

export const enabledBaseNetworks: Readable<EthereumNetwork[]> = derived(
	[testnets],
	([$testnets]) => [
		...(BASE_MAINNET_ENABLED ? [BASE_NETWORK] : []),
		...($testnets ? [BASE_SEPOLIA_NETWORK] : [])
	]
);
