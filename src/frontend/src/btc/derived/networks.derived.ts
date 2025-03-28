import {
	BTC_MAINNET_ENABLED,
	BTC_MAINNET_NETWORK,
	BTC_REGTEST_NETWORK,
	BTC_TESTNET_NETWORK
} from '$env/networks/networks.btc.env';
import { LOCAL } from '$lib/constants/app.constants';
import { testnetsEnabled } from '$lib/derived/testnets.derived';
import type { Network } from '$lib/types/network';
import { derived, type Readable } from 'svelte/store';

export const enabledBitcoinNetworks: Readable<Network[]> = derived(
	[testnetsEnabled],
	([$testnetsEnabled]) => [
		...(BTC_MAINNET_ENABLED ? [BTC_MAINNET_NETWORK] : []),
		...($testnetsEnabled ? [BTC_TESTNET_NETWORK, ...(LOCAL ? [BTC_REGTEST_NETWORK] : [])] : [])
	]
);
