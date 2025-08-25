import { BTC_MAINNET_ENABLED, NETWORK_BITCOIN_ENABLED } from '$env/networks.btc.env';
import { BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN } from '$env/tokens.btc.env';
import { testnets } from '$lib/derived/testnets.derived';
import type { Token } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';

export const enabledBitcoinTokens: Readable<Token[]> = derived([testnets], ([$testnets]) =>
	NETWORK_BITCOIN_ENABLED
		? [
				...(BTC_MAINNET_ENABLED ? [BTC_MAINNET_TOKEN] : []),
				...($testnets ? [BTC_TESTNET_TOKEN] : [])
			]
		: []
);
