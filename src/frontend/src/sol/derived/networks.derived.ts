import {
	SOLANA_DEVNET_NETWORK,
	SOLANA_LOCAL_NETWORK,
	SOLANA_MAINNET_NETWORK,
	SOLANA_NETWORK_ENABLED,
	SOLANA_TESTNET_NETWORK
} from '$env/networks/networks.sol.env';
import { LOCAL } from '$lib/constants/app.constants';
import { testnets } from '$lib/derived/testnets.derived';
import type { Network } from '$lib/types/network';
import { derived, type Readable } from 'svelte/store';

export const enabledSolanaNetworks: Readable<Network[]> = derived([testnets], ([$testnets]) =>
	SOLANA_NETWORK_ENABLED
		? [
				SOLANA_MAINNET_NETWORK,
				...($testnets
					? [
							SOLANA_TESTNET_NETWORK,
							SOLANA_DEVNET_NETWORK,
							...(LOCAL ? [SOLANA_LOCAL_NETWORK] : [])
						]
					: [])
			]
		: []
);
