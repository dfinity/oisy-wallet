import {
	SOLANA_DEVNET_NETWORK,
	SOLANA_LOCAL_NETWORK,
	SOLANA_MAINNET_NETWORK,
	SOLANA_NETWORK_ENABLED,
	SOLANA_TESTNET_NETWORK
} from '$env/networks.sol.env';
import { LOCAL } from '$lib/constants/app.constants';
import { testnets } from '$lib/derived/testnets.derived';
import type { SolNetwork } from '$sol/types/network';
import { derived, type Readable } from 'svelte/store';

export const enabledSolanaNetworks: Readable<SolNetwork[]> = derived([testnets], ([$testnets]) =>
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
