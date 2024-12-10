import { derived, type Readable } from 'svelte/store';
import { BTC_MAINNET_NETWORK } from '$env/networks.env';

export const explorerUrl: Readable<string> = derived(
	[], () => BTC_MAINNET_NETWORK.explorerUrl
);