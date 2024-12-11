import { BTC_MAINNET_NETWORK, BTC_REGTEST_NETWORK, BTC_TESTNET_NETWORK } from '$env/networks.env';
import { BTC_MAINNET_ENABLED } from '$env/networks/networks.btc.env';
import { LOCAL } from '$lib/constants/app.constants';
import { testnets } from '$lib/derived/testnets.derived';
import type { Network } from '$lib/types/network';
import { derived, type Readable } from 'svelte/store';

export const enabledBitcoinNetworks: Readable<Network[]> = derived([testnets], ([$testnets]) => [
	...(BTC_MAINNET_ENABLED ? [BTC_MAINNET_NETWORK] : []),
	...($testnets ? [BTC_TESTNET_NETWORK, ...(LOCAL ? [BTC_REGTEST_NETWORK] : [])] : [])
]);
