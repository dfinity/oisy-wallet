import { BTC_MAINNET_ENABLED, NETWORK_BITCOIN_ENABLED } from '$env/networks.btc.env';
import { BTC_MAINNET_NETWORK, BTC_TESTNET_NETWORK } from '$env/networks.env';
import { testnets } from '$lib/derived/testnets.derived';
import type { Network } from '$lib/types/network';
import { derived, type Readable } from 'svelte/store';

export const enabledBitcoinNetworks: Readable<Network[]> = derived([testnets], ([$testnets]) =>
	NETWORK_BITCOIN_ENABLED
		? [
				...(BTC_MAINNET_ENABLED ? [BTC_MAINNET_NETWORK] : []),
				...($testnets ? [BTC_TESTNET_NETWORK] : [])
			]
		: []
);
