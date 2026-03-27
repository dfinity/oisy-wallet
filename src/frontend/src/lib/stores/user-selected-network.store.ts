import type { NetworkId } from '$lib/types/network';
import { writable } from 'svelte/store';

export const userSelectedNetworkStore = writable<NetworkId | undefined>(undefined);
