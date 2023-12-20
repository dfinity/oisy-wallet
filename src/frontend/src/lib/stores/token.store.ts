import { ETHEREUM_NETWORK_ID } from '$lib/constants/networks.constants';
import type { NetworkId } from '$lib/types/network';
import { writable } from 'svelte/store';

export const networkId = writable<NetworkId>(ETHEREUM_NETWORK_ID);
