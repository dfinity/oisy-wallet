import { writable } from 'svelte/store';

export const walletConnectPaired = writable(false);

export const walletConnectReconnecting = writable(false);
