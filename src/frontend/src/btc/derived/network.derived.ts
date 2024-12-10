import { BTC_MAINNET_NETWORK } from '$env/networks.env';
import { derived, type Readable } from 'svelte/store';

export const explorerUrl: Readable<string> = derived([], () => BTC_MAINNET_NETWORK.explorerUrl);
