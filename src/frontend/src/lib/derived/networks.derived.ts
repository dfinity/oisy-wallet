import { ICP_NETWORK } from '$env/networks.env';
import { ethereumNetworks } from '$eth/derived/networks.derived';
import type { Network } from '$lib/types/network';
import { derived, type Readable } from 'svelte/store';

export const networks: Readable<Network[]> = derived([ethereumNetworks], ([$ethereumNetworks]) => [
	...$ethereumNetworks,
	ICP_NETWORK
]);
