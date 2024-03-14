import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks.env';
import { ETH_MAINNET_ENABLED } from '$env/networks.eth.env';
import type { EthereumNetwork } from '$eth/types/network';
import { LOCAL } from '$lib/constants/app.constants';
import { testnetsStore } from '$lib/stores/testnets.store';
import { derived, type Readable } from 'svelte/store';

export const ethereumNetworks: Readable<EthereumNetwork[]> = derived(
	[testnetsStore],
	([$testnetsStore]) => [
		...(ETH_MAINNET_ENABLED ? [ETHEREUM_NETWORK] : []),
		...($testnetsStore?.enabled ?? LOCAL ? [SEPOLIA_NETWORK] : [])
	]
);
